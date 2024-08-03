import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { If, float, instanceIndex, min, smoothstep, storage, timerDelta, timerGlobal, tslFn, uint, uniform, uv, vec3, vec4 } from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { simplexNoise4d } from './tsl/simplexNoise4d.js'
import { simplexNoise3d } from './tsl/simplexNoise3d.js'
import { curlNoise3d } from './tsl/curlNoise3d.js'
import { curlNoise4d } from './tsl/curlNoise4d.js'

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 300 })

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4.5, 4, 11)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor('#29191f')

/**
 * Cursor interaction
 */
const intersectionScene = await gltfLoader.loadAsync('./intersect.glb')
const intersectionModel = intersectionScene.scene.children[0]
intersectionModel.visible = false
scene.add(intersectionModel)

const cursor = {}
cursor.coordinates = new THREE.Vector2()
cursor.raycaster = new THREE.Raycaster()

window.addEventListener('mousemove', (event) =>
{
    cursor.coordinates.x = (event.clientX / sizes.width - 0.5) * 2
    cursor.coordinates.y = - (event.clientY / sizes.height - 0.5) * 2
})

/**
 * Particles
 */
// Base geometry
const baseGeometry = {}
baseGeometry.model = await gltfLoader.loadAsync('./model.glb')
baseGeometry.instance = baseGeometry.model.scene.children[0].geometry
baseGeometry.positionAttribute = baseGeometry.instance.attributes.position
baseGeometry.colorAttribute = baseGeometry.instance.attributes.color
baseGeometry.count = baseGeometry.instance.attributes.position.count

// Material
const material = new THREE.SpriteNodeMaterial()

// Buffers
const basePositionBuffer = storage(new THREE.StorageInstancedBufferAttribute(baseGeometry.positionAttribute.array, 3), 'vec3', baseGeometry.count)
const colorBuffer = storage(new THREE.StorageInstancedBufferAttribute(baseGeometry.colorAttribute.array, 4), 'vec4', baseGeometry.count)
const positionBuffer = storage(new THREE.StorageInstancedBufferAttribute(baseGeometry.count, 3), 'vec3', baseGeometry.count)
const lifeBuffer = storage(new THREE.StorageInstancedBufferAttribute(baseGeometry.count, 1), 'float', baseGeometry.count)
const strengthBuffer = storage(new THREE.StorageInstancedBufferAttribute(baseGeometry.count, 1), 'float', baseGeometry.count)

// Uniforms
const flowFieldPositionFrequency = uniform(0.2)
const flowFieldTimeFrequency = uniform(0.2)
const flowfieldStrength = uniform(2)
// const influence = uniform(0.6)
const size = uniform(0.065)
const decayFrequency = uniform(0.6)
const cursorPosition = uniform(vec3())
const cursorActive = uniform(0)
const cursorRadius = uniform(2)

// Init compute
const init = tslFn(() =>
{
    const basePosition = basePositionBuffer.element(instanceIndex)
    const position = positionBuffer.element(instanceIndex)
    const life = lifeBuffer.element(instanceIndex)
    const strength = strengthBuffer.element(instanceIndex)
    
    position.assign(basePosition)
    life.assign(instanceIndex.add(uint(Math.random() * 0xffffff)).hash())
    strength.assign(0)
})
const initCompute = init().compute(baseGeometry.count)
renderer.compute(initCompute)

// Update compute
const update = tslFn(() =>
{
    // Setup
    const time = timerGlobal().mul(flowFieldTimeFrequency)
    const delta = timerDelta()

    // Buffers
    const basePosition = basePositionBuffer.element(instanceIndex)
    const position = positionBuffer.element(instanceIndex)
    const life = lifeBuffer.element(instanceIndex)
    const strength = strengthBuffer.element(instanceIndex)
    
    // Influence based strength
    // const remapedInfluence = influence.remap(0, 1, 1, -1)
    // const strength = simplexNoise4d(vec4(basePosition.add(0).mul(flowFieldPositionFrequency), time)).smoothstep(remapedInfluence, 1)

    // Cursor based strength
    const distanceToCursor = cursorPosition.distance(basePosition)
    const cursorStrength = float(cursorRadius).sub(distanceToCursor).smoothstep(0, 1)
    cursorStrength.mulAssign(delta.mul(5))
    
    strength.assign(strength.add(cursorStrength).sub(delta.mul(0.5)).clamp(0, 1))

    // Flowfield
    const flowfield = curlNoise4d(vec4(position.add(1).mul(flowFieldPositionFrequency), time))
    position.addAssign(flowfield.mul(delta).mul(strength).mul(flowfieldStrength))

    // Life
    const distanceDecay = basePosition.distance(position).remapClamp(0, 1, 0.2, 1)
    const newLife = life.add(delta.mul(decayFrequency).mul(distanceDecay))
    If(newLife.greaterThan(1), () =>
    {
        position.assign(basePosition)
    })
    life.assign(newLife.mod(1))
})
const updateCompute = update().compute(baseGeometry.count)

// Position
material.positionNode = positionBuffer.toAttribute()

// Color
material.colorNode = tslFn(() =>
{
    uv().sub(0.5).length().greaterThan(0.5).discard()

    return colorBuffer.element(instanceIndex)
})()

// Scale
material.scaleNode = tslFn(() =>
{
    const life = lifeBuffer.toAttribute()

    const scale = min(
        smoothstep(0, 0.1, life),
        smoothstep(1, 0.7, life)
    )
    scale.mulAssign(instanceIndex.hash().remap(0.25, 1).mul(size))

    return scale
})()

// Mesh
const geometry = new THREE.PlaneGeometry(1, 1)
const mesh = new THREE.InstancedMesh(geometry, material, baseGeometry.count)
scene.add(mesh)

// Debug
gui.add(flowFieldPositionFrequency, 'value', 0, 1, 0.001).name('flowFieldPositionFrequency')
gui.add(flowFieldTimeFrequency, 'value', 0, 1, 0.001).name('flowFieldTimeFrequency')
gui.add(flowfieldStrength, 'value', 0, 10, 0.001).name('flowfieldStrength')
// gui.add(influence, 'value', 0, 1, 0.001).name('influence')
gui.add(size, 'value', 0, 1, 0.001).name('size')
gui.add(decayFrequency, 'value', 0, 1, 0.001).name('decayFrequency')
gui.add(cursorRadius, 'value', 0, 5, 0.001).name('cursorRadius')

/**
 * Animate
 */
const tick = () =>
{
    // Update controls
    controls.update()

    // Cursor
    cursor.raycaster.setFromCamera(cursor.coordinates, camera)
    const intersects = cursor.raycaster.intersectObject(intersectionModel)
    if(intersects.length)
    {
        cursorPosition.value.copy(intersects[0].point)
        cursorActive.value = 1
    }
    else
    {
        cursorActive.value = 0
    }

    // Render
    renderer.compute(updateCompute)
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
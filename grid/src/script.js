import GUI from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { If, min, MeshBasicNodeMaterial, SpriteNodeMaterial, color, range, sin, instanceIndex, timerDelta, smoothstep, step, timerGlobal, tslFn, uniform, uv, vec3, vec4, positionWorld, vec2, normalWorld, mix, max, rangeFog, densityFog } from 'three/examples/jsm/nodes/Nodes.js'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import { storage } from 'three/examples/jsm/nodes/Nodes.js'
import StorageInstancedBufferAttribute from 'three/examples/jsm/renderers/common/StorageInstancedBufferAttribute.js'
import { simplexNoise4d } from './tsl/simplexNoise4d.js'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'

/**
 * Base
 */
// Debug
const debugObject = {}
const gui = new GUI({
    width: 400
})

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const gltfLoader = new GLTFLoader()

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
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 6
camera.position.y = 3
camera.position.z = 10
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new WebGPURenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor('#1b191f')

debugObject.clearColor = '#19191f'
renderer.setClearColor(debugObject.clearColor)
gui
    .addColor(debugObject, 'clearColor')
    .onChange(() =>
    {
        renderer.setClearColor(debugObject.clearColor)
    })

/**
 * Particles
 */
const material = new SpriteNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
const count = 100

const positionBuffer = storage(new StorageInstancedBufferAttribute(count, 3), 'vec3', count)
const velocityBuffer = storage(new StorageInstancedBufferAttribute(count, 3), 'vec3', count)
const lifeBuffer = storage(new StorageInstancedBufferAttribute(count, 1), 'float', count)

// Compute init
const particlesInit = tslFn(() =>
{
    // Position
    const position = positionBuffer.element(instanceIndex)
    position.assign(vec3(99999))

    // Life
    const life = lifeBuffer.element(instanceIndex)
    life.assign(instanceIndex.hash())
})
const particlesInitCompute = particlesInit().compute(count)
renderer.compute(particlesInitCompute)

// Compute update
const particlesUpdate = tslFn(() =>
{
    const position = positionBuffer.element(instanceIndex)
    const velocity = velocityBuffer.element(instanceIndex)
    const life = lifeBuffer.element(instanceIndex)

    const delta = timerDelta()
    const time = timerGlobal(0.2)

    const noiseInput = position.mul(2)
    const noise = vec3(
        simplexNoise4d(vec4(noiseInput, time)),
        simplexNoise4d(vec4(noiseInput.add(10, 10), time)),
        simplexNoise4d(vec4(noiseInput.add(20, 20), time))
    ).mul(delta).mul(1)

    velocity.addAssign(noise)
    position.addAssign(velocity.mul(delta))

    const lifeDamper = delta.mul(0.3)
    const newLife = life.add(lifeDamper)
    If(newLife.greaterThan(1), () =>
    {
        position.assign(vec3(0))
        velocity.assign(vec3(0))
        newLife.assign(0)
    })

    life.assign(newLife)
})
const particlesUpdateCompute = particlesUpdate().compute(count)

material.positionNode = positionBuffer.toAttribute()


material.colorNode = tslFn(() =>
{
    uv().sub(0.5).length().greaterThan(0.5).discard()
    return vec3(1)
})()

const life = lifeBuffer.toAttribute()
const intro = life.remap(0, 0.2, 0, 1)
const outro = life.remap(0.5, 1, 1, 0)
const scale = min(intro, outro).smoothstep(0, 1).mul(0.05)

material.scaleNode = scale

// Mesh
const geometry = new THREE.PlaneGeometry(1, 1)
const mesh = new THREE.InstancedMesh(geometry, material, count)
// scene.add(mesh)

/**
 * Material
 */
const projectedGridUv = tslFn(([ position, normal ]) =>
{
    const dotX = normal.dot(vec3(1, 0, 0)).abs()
    const dotY = normal.dot(vec3(0, 1, 0)).abs()
    const dotZ = normal.dot(vec3(0, 0, 1)).abs()

    const uvX = position.yz.toVar()
    const uvY = position.xz.toVar()
    const uvZ = position.xy.toVar()

    const uv = uvX

    If(dotZ.greaterThan(dotX), () =>
    {
        uv.assign(uvZ)
    })
    If(dotY.greaterThan(dotX).and(dotY.greaterThan(dotZ)), () =>
    {
        uv.assign(uvY)
    })

    return uv
})

const projectedGrid = tslFn(([scale, thickness, offset]) =>
{
    const uv = projectedGridUv(positionWorld, normalWorld).div(scale).add(thickness.mul(0.5)).add(offset).mod(1)
    return max(
        uv.x.step(thickness),
        uv.y.step(thickness)
    )
})

const scaleUniform = uniform(0.1)
const thicknessUniform = uniform(0.1)
const offsetUniform = uniform(vec2(0, 0))
const colorBackUniform = uniform(color('#19191f'))
const colorSmallUniform = uniform(color('#39364f'))
const colorBigUniform = uniform(color('#705df2'))

let finalColor = mix(
    colorBackUniform,
    colorSmallUniform,
    projectedGrid(scaleUniform, thicknessUniform, offsetUniform)
)
finalColor = mix(
    finalColor,
    colorBigUniform,
    projectedGrid(scaleUniform.mul(10), thicknessUniform.div(10), offsetUniform)
)

const gridMaterial = new MeshBasicNodeMaterial()
gridMaterial.colorNode = vec4(finalColor, 1)

scene.fogNode = rangeFog(colorBackUniform, 5, 30)

gui.add(scaleUniform, 'value', 0, 0.2, 0.001).name('scale')
gui.add(thicknessUniform, 'value', 0, 1, 0.001).name('thickness')
gui.add(offsetUniform.value, 'x', 0, 1, 0.001).name('offsetX')
gui.add(offsetUniform.value, 'y', 0, 1, 0.001).name('offsetY')
gui.addColor({ color: colorBackUniform.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorBackUniform.value.set(value) }).name('colorBack')
gui.addColor({ color: colorSmallUniform.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorSmallUniform.value.set(value) }).name('colorSmall')
gui.addColor({ color: colorBigUniform.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorBigUniform.value.set(value) }).name('colorBig')

/**
 * Objects
 */
// Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    gridMaterial
)
floor.rotation.x = - Math.PI * 0.5
floor.position.y = - 1
scene.add(floor)

// Torus knot
const torusKnot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32),
    gridMaterial
)
torusKnot.position.x = - 3
scene.add(torusKnot)

// Sphere
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    gridMaterial
)
sphere.position.x = 3
scene.add(sphere)

// Suzanne
let suzanne = null
gltfLoader.load(
    './suzanne.glb',
    (gltf) =>
    {
        suzanne = gltf.scene
        suzanne.traverse((child) =>
        {
            if(child.isMesh)
                child.material = gridMaterial
        })
        scene.add(suzanne)
    }
)

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Render
    renderer.compute(particlesUpdateCompute)
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
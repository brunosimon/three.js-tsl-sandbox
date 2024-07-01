import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import { If, SpriteNodeMaterial, color, cond, float, instanceIndex, mix, step, storage, texture, timerDelta, timerGlobal, tslFn, uniform, uv, varying, vec3, vec4 } from 'three/examples/jsm/nodes/Nodes.js'
import StorageInstancedBufferAttribute from 'three/examples/jsm/renderers/common/StorageInstancedBufferAttribute.js'
import { simplexNoise4d } from './tsl/simplexNoise4d.js'
import { Timer } from 'three/examples/jsm/Addons.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const textureLoader = new THREE.TextureLoader()

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
camera.position.set(0, 0, 16)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new WebGPURenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const clearColor = new THREE.Color('#191017')
gui.addColor({ color: clearColor.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => { renderer.setClearColor(value) })

renderer.setClearColor(clearColor.getHex(THREE.SRGBColorSpace))

/**
 * cursor
 */
const cursor = {}

// Interactive plane
cursor.interactivePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide })
)
cursor.interactivePlane.visible = false
scene.add(cursor.interactivePlane)

// Raycaster
cursor.raycaster = new THREE.Raycaster()

// Position
cursor.position = new THREE.Vector2(9999, 9999)

window.addEventListener('pointermove', (event) =>
{
    cursor.position.x = (event.clientX / sizes.width) * 2 - 1
    cursor.position.y = - (event.clientY / sizes.height) * 2 + 1
})

/**
 * Particles
 */
// Setup
const material = new SpriteNodeMaterial()
const size = 128
const count = size * size

// Uniforms
const cursorPosition = uniform(vec3(0, 0, 0))
const cursorVelocity = uniform(vec3(0))
const cursorRadius = uniform(1)
const cursorStrength = uniform(10)
const damping = uniform(2.5)
const attractionStrength = uniform(0.2)
const randomnessStrength = uniform(0.05)

// Buffer and attributes
const uvArray = new Float32Array(count * 2)
const basePositionArray = new Float32Array(count * 3)
const directionArray = new Float32Array(count * 3)

for(let i = 0; i < count; i++)
{
    const i2 = i * 2
    const i3 = i * 3

    const uvX = i % size / size
    const uvY = Math.floor(i / size) / size

    uvArray[i2    ] = uvX
    uvArray[i2 + 1] = uvY

    basePositionArray[i3    ] = (uvX - 0.5) * 10
    basePositionArray[i3 + 1] = (uvY - 0.5) * 10
    basePositionArray[i3 + 2] = 0

    const spherical = new THREE.Spherical(1, Math.acos(2 * Math.random() - 1), Math.random() * Math.PI * 2)
    const direction = new THREE.Vector3().setFromSpherical(spherical)

    directionArray[i3    ] = direction.x
    directionArray[i3 + 1] = direction.y
    directionArray[i3 + 2] = direction.z
}

const uvBuffer = storage(new StorageInstancedBufferAttribute(uvArray, 2), 'vec2', count)
const uvAttribute = uvBuffer.toAttribute()

const basePositionBuffer = storage(new StorageInstancedBufferAttribute(basePositionArray, 3), 'vec3', count)

const directionBuffer = storage(new StorageInstancedBufferAttribute(directionArray, 3), 'vec3', count)

const positionBuffer = storage(new StorageInstancedBufferAttribute(count, 3), 'vec3', count)
const velocityBuffer = storage(new StorageInstancedBufferAttribute(count, 3), 'vec3', count)

// Compute init
const particlesInit = tslFn(() =>
{
    // Buffers
    const basePosition = basePositionBuffer.element(instanceIndex)
    const position = positionBuffer.element(instanceIndex)
    const velocity = velocityBuffer.element(instanceIndex)

    // Initial state
    position.assign(basePosition)
    velocity.assign(vec3(0))
})

const particlesInitCompute = particlesInit().compute(count)
renderer.compute(particlesInitCompute)

// Compute update
const particlesUpdate = tslFn(() =>
{
    // Buffers
    const basePosition = basePositionBuffer.element(instanceIndex)
    const position = positionBuffer.element(instanceIndex)
    const velocity = velocityBuffer.element(instanceIndex)
    const direction = directionBuffer.element(instanceIndex)

    // Setup
    const time = timerGlobal()
    const delta = timerDelta()
    const newVelocity = velocity

    // Attraction
    const attraction = basePosition.sub(position)
    const attractionInfluence = attraction.mul(attractionStrength)

    // Cursor influence
    const cursorDistance = cursorPosition.distance(position)
    const cursorInfluence = cursorRadius.sub(cursorDistance).smoothstep(0, cursorRadius).div(cursorRadius)
    const cursorRandomness = direction.mul(randomnessStrength)
    newVelocity.addAssign(cursorVelocity.add(cursorRandomness).mul(cursorInfluence).mul(cursorStrength))

    // Base attraction
    newVelocity.addAssign(attractionInfluence)

    // Damping
    newVelocity.mulAssign(float(1).sub(delta.mul(damping)))

    // Update
    velocity.assign(newVelocity)
    position.addAssign(velocity.mul(delta))
})
const particlesUpdateCompute = particlesUpdate().compute(count)

// Picture
const pictureTexture = textureLoader.load('./picture-1.png')
const pictureStrength = varying(texture(pictureTexture, uvAttribute).r)

// Colors
const colorA = uniform(color('#ffa575'))
const colorB = uniform(color('#6a1599'))

// Position
material.positionNode = positionBuffer.toAttribute()

// Scale
material.scaleNode = pictureStrength.oneMinus().pow(2).oneMinus().mul(0.075)

// Color
material.colorNode = tslFn(() =>
{
    uv().sub(0.5).length().greaterThan(0.5).discard()
    return vec4(mix(colorB, colorA, pictureStrength.pow(2)), 1)
})()

// Mesh
const geometry = new THREE.PlaneGeometry(1, 1)
const particles = new THREE.InstancedMesh(geometry, material, count)
scene.add(particles)

// Debug
gui.addColor({ color: colorA.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => { colorA.value.set(value) })
gui.addColor({ color: colorB.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => { colorB.value.set(value) })
gui.add(cursorRadius, 'value', 0, 5, 0.001).name('cursorRadius')
gui.add(cursorStrength, 'value', 0, 50, 0.01).name('cursorStrength')
gui.add(damping, 'value', 0, 10, 0.001).name('damping')
gui.add(attractionStrength, 'value', 0, 1, 0.001).name('attractionStrength')
gui.add(randomnessStrength, 'value', 0, 0.1, 0.001).name('randomnessStrength')

/**
 * Animate
 */
const timer = new Timer()
const tick = () =>
{
    // Timer
    timer.update()
    const delta = timer.getDelta()

    // Update controls
    controls.update()

    /**
     * Raycaster
     */
    cursor.raycaster.setFromCamera(cursor.position, camera)
    const intersections = cursor.raycaster.intersectObject(cursor.interactivePlane)

    if(intersections.length)
    {
        const point = intersections[0].point

        const cursorDelta = point.clone().sub(cursorPosition.value)
        cursorVelocity.value.copy(cursorDelta)
        
        cursorPosition.value.set(point.x, point.y, point.z)
    }
    else
    {
        cursorVelocity.value.set(0, 0, 0)
    }

    // Render
    renderer.compute(particlesUpdateCompute)
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
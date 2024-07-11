import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { If, PI, SpriteNodeMaterial, color, cos, float, hash, instanceIndex, loop, max, min, mix, sin, storage, timerDelta, tslFn, uint, uniform, uniforms, vec3, vec4 } from 'three/src/nodes/Nodes.js'
import StorageInstancedBufferAttribute from 'three/src/renderers/common/StorageInstancedBufferAttribute.js'
import WebGPURenderer from 'three/src/renderers/webgpu/WebGPURenderer.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

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
camera.position.set(3, 5, 8)
scene.add(camera)

// Controls
const cameraControls = new OrbitControls(camera, canvas)
cameraControls.enableDamping = true

/**
 * Renderer
 */
const renderer = new WebGPURenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor('#000000')

/**
 * Attractors
 */
const attractors = uniforms([
    new THREE.Vector3(-2, 0, 0),
    new THREE.Vector3(2, 0, 0),
    new THREE.Vector3(1, 0.1, 2)
])
const attractorsLength = uniform(attractors.array.length)
for(const _attractor of attractors.array)
{
    const attractor = {}
    attractor.reference = new THREE.Object3D()
    attractor.reference.position.copy(_attractor)
    scene.add(attractor.reference)

    attractor.controls = new TransformControls(camera, canvas)
    attractor.controls.attach(attractor.reference)
    attractor.controls.visible = true
    attractor.controls.enabled = attractor.controls.visible
    scene.add(attractor.controls)
    
    attractor.controls.addEventListener('dragging-changed', (event) =>
    {
        cameraControls.enabled = !event.value
    })
    
    attractor.controls.addEventListener('change', (event) =>
    {
        _attractor.copy(attractor.reference.position)
    })
}

/**
 * Particles
 */
// Setup
const count = Math.pow(2, 17)
const material = new SpriteNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })

// Uniforms
const attractorMass = uniform(Number(`1e${5}`))
const particleMass = uniform(Number(`1e${3}`))
const timeScale = uniform(5)
const maxSpeed = uniform(0.6)
const gravityConstant = 6.67e-11
const colorA = color('#6a1599')
const colorB = color('#ffa575')

// Attributes / Buffers
const positionBuffer = storage(new StorageInstancedBufferAttribute(count, 3), 'vec3', count)
const velocityBuffer = storage(new StorageInstancedBufferAttribute(count, 3), 'vec3', count)

// Functions
const sphericalToVec3 = tslFn(([phi, theta]) =>
{
    const sinPhiRadius = sin(phi)

    return vec3(
        sinPhiRadius.mul(sin(theta)),
        cos(phi),
        sinPhiRadius.mul(cos(theta))
    )
})

// Init
const init = tslFn(() =>
{
    const position = positionBuffer.element(instanceIndex)
    const velocity = velocityBuffer.element(instanceIndex)

    const basePosition = vec3(
        instanceIndex.add(uint(Math.random() * 0xffffff)).hash(),
        instanceIndex.add(uint(Math.random() * 0xffffff)).hash(),
        instanceIndex.add(uint(Math.random() * 0xffffff)).hash()
    ).sub(0.5).mul(vec3(5, 0.1, 5))
    position.assign(basePosition)

    const phi = instanceIndex.add(uint(Math.random() * 0xffffff)).hash().mul(PI).mul(2)
    const theta = instanceIndex.add(uint(Math.random() * 0xffffff)).hash().mul(PI)
    const baseVelocity = sphericalToVec3(phi, theta).mul(0.01)
    velocity.assign(baseVelocity)
})

const initCompute = init().compute(count)

const reset = () =>
{
    renderer.compute(initCompute)
}
reset()


// Update
const update = tslFn(() =>
{
    const delta = timerDelta().mul(timeScale)
    const position = positionBuffer.element(instanceIndex)
    const velocity = velocityBuffer.element(instanceIndex)

    // Calculate attraction
    const force = vec3(0).toVar()

    loop(attractorsLength, ({ i }) =>
    {
        const target = attractors.element(i)
        const toTarget = target.sub(position)
        const distance = toTarget.length()
        const direction = toTarget.normalize()
        const attractorForce = attractorMass.mul(particleMass).mul(gravityConstant).div(distance.pow(2))

        force.addAssign(direction.mul(attractorForce))
    })

    // Velocity
    velocity.addAssign(force.mul(delta))
    const speed = velocity.length()
    If(speed.greaterThan(maxSpeed), () =>
    {
        velocity.assign(velocity.normalize().mul(maxSpeed))
    })
    velocity.mulAssign(0.99)

    // Position
    position.addAssign(velocity.mul(delta))
})
const updateCompute = update().compute(count)

// Assign nodes
material.positionNode = positionBuffer.toAttribute()

material.colorNode = tslFn(() =>
{
    const velocity = velocityBuffer.toAttribute()
    const speed = velocity.length()
    const colorMix = speed.div(maxSpeed).smoothstep(0, 0.5)
    const finalColor = mix(colorA, colorB, colorMix)

    // const alpha = speed.div(maxSpeed).smoothstep(0.0, 0.2)
    return vec4(finalColor, 1)
})()
material.scaleNode = instanceIndex.add(uint(Math.random() * 0xffffff)).hash().mul(0.015)

const geometry = new THREE.PlaneGeometry(1, 1)
const mesh = new THREE.InstancedMesh(geometry, material, count)
scene.add(mesh)

// Debug
gui.add({ attractorMassPower: attractorMass.value.toString().length - 1 }, 'attractorMassPower', 1, 10, 1).onChange(value => attractorMass.value = Number(`1e${value}`))
gui.add({ particleMassPower: particleMass.value.toString().length - 1 }, 'particleMassPower', 1, 10, 1).onChange(value => particleMass.value = Number(`1e${value}`))
gui.add(timeScale, 'value', 1, 10, 0.01).name('timeScale')
gui.add(maxSpeed, 'value', 0, 10, 0.01).name('maxSpeed')
gui.addColor({ color: colorA.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorA.value.set(value) }).name('colorA')
gui.addColor({ color: colorB.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorB.value.set(value) }).name('colorB')
gui.add({ reset }, 'reset')

/**
 * Animate
 */
const tick = () =>
{
    // Update camera controls
    cameraControls.update()

    // Render
    renderer.compute(updateCompute)
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { If, PI, SpriteNodeMaterial, color, cos, instanceIndex, loop, mix, mod, sin, storage, timerDelta, tslFn, uint, uniform, uniforms, vec3, vec4 } from 'three/src/nodes/Nodes.js'
import StorageInstancedBufferAttribute from 'three/src/renderers/common/StorageInstancedBufferAttribute.js'
import WebGPURenderer from 'three/src/renderers/webgpu/WebGPURenderer.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 300 })

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
const attractorsPositions = uniforms([
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(1, 0, -0.5),
    new THREE.Vector3(0, 0.5, 1)
])
const attractorsRotationAxes = uniforms([
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(-1, 0, 0).normalize()
])
const attractorsLength = uniform(attractorsPositions.array.length)
const attractors = []
const helpersRingGeometry = new THREE.RingGeometry(1, 1.02, 32, 1, 0, Math.PI * 1.5)
const helpersArrowGeometry = new THREE.ConeGeometry(0.1, 0.4, 12, 1, false)
const helpersMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
for(let i = 0; i < attractorsPositions.array.length; i++)
{
    const attractor = {}
    attractor.position = attractorsPositions.array[i]
    attractor.orientation = attractorsRotationAxes.array[i]
    attractor.reference = new THREE.Object3D()
    attractor.reference.position.copy(attractor.position)
    attractor.reference.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), attractor.orientation)
    scene.add(attractor.reference)

    attractor.helper = new THREE.Group()
    attractor.helper.scale.setScalar(0.325)
    attractor.reference.add(attractor.helper)

    attractor.ring = new THREE.Mesh(helpersRingGeometry, helpersMaterial)
    attractor.ring.rotation.x = - Math.PI * 0.5
    attractor.helper.add(attractor.ring)

    attractor.arrow = new THREE.Mesh(helpersArrowGeometry, helpersMaterial)
    attractor.arrow.position.x = 1
    attractor.arrow.position.z = 0.2
    attractor.arrow.rotation.x = Math.PI * 0.5
    attractor.helper.add(attractor.arrow)

    attractor.controls = new TransformControls(camera, canvas)
    attractor.controls.mode = 'rotate'
    attractor.controls.size = 0.5
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
        attractor.position.copy(attractor.reference.position)
        attractor.orientation.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(attractor.reference.quaternion))
    })

    attractors.push(attractor)
}

/**
 * Particles
 */
// Setup
const count = Math.pow(2, 18)
const material = new SpriteNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })

// Uniforms
const attractorMass = uniform(Number(`1e${7}`))
const particleGlobalMass = uniform(Number(`1e${4}`))
const timeScale = uniform(1)
const spinningStrength = uniform(3)
const maxSpeed = uniform(8)
const gravityConstant = 6.67e-11
const velocityDamping = uniform(0.1)
const scale = uniform(0.008)
const boundHalfExtent = uniform(8)
const colorA = uniform(color('#5900ff'))
const colorB = uniform(color('#ffa575'))

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
    ).sub(0.5).mul(vec3(5, 0.2, 5))
    position.assign(basePosition)

    const phi = instanceIndex.add(uint(Math.random() * 0xffffff)).hash().mul(PI).mul(2)
    const theta = instanceIndex.add(uint(Math.random() * 0xffffff)).hash().mul(PI)
    const baseVelocity = sphericalToVec3(phi, theta).mul(0.05)
    velocity.assign(baseVelocity)
})

const initCompute = init().compute(count)

const reset = () =>
{
    renderer.compute(initCompute)
}
reset()

// Update
const particleMassMultiplier = instanceIndex.add(uint(Math.random() * 0xffffff)).hash().remap(0.25, 1).toVar()
const particleMass = particleMassMultiplier.mul(particleGlobalMass).toVar()
const update = tslFn(() =>
{
    const delta = timerDelta().mul(timeScale).min(1/30).toVar()
    const position = positionBuffer.element(instanceIndex)
    const velocity = velocityBuffer.element(instanceIndex)

    // Calculate attraction
    const force = vec3(0).toVar()

    loop(attractorsLength, ({ i }) =>
    {
        const attractorPosition = attractorsPositions.element(i)
        const attractorRotationAxis = attractorsRotationAxes.element(i)
        const toAttractor = attractorPosition.sub(position)
        const distance = toAttractor.length()
        const direction = toAttractor.normalize()

        // Gravity
        const gravityStrength = attractorMass.mul(particleMass).mul(gravityConstant).div(distance.pow(2)).toVar()
        const gravityForce = direction.mul(gravityStrength)
        force.addAssign(gravityForce)

        // Spinning
        const spinningForce = attractorRotationAxis.mul(gravityStrength).mul(spinningStrength)
        const SpinningVelocity = spinningForce.cross(toAttractor)
        force.addAssign(SpinningVelocity)
    })

    // Velocity
    velocity.addAssign(force.mul(delta))
    const speed = velocity.length()
    If(speed.greaterThan(maxSpeed), () =>
    {
        velocity.assign(velocity.normalize().mul(maxSpeed))
    })
    velocity.mulAssign(velocityDamping.oneMinus())

    // Position
    position.addAssign(velocity.mul(delta))

    // Loop
    const halfHalfExtent = boundHalfExtent.div(2).toVar()
    position.assign(mod(position.add(halfHalfExtent), boundHalfExtent).sub(halfHalfExtent))
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

    return vec4(finalColor, 1)
})()
material.scaleNode = particleMassMultiplier.mul(scale)

const geometry = new THREE.PlaneGeometry(1, 1)
const mesh = new THREE.InstancedMesh(geometry, material, count)
scene.add(mesh)

// Debug
gui.add({ attractorMassExponent: attractorMass.value.toString().length - 1 }, 'attractorMassExponent', 1, 10, 1).onChange(value => attractorMass.value = Number(`1e${value}`))
gui.add({ particleGlobalMassExponent: particleGlobalMass.value.toString().length - 1 }, 'particleGlobalMassExponent', 1, 10, 1).onChange(value => particleGlobalMass.value = Number(`1e${value}`))
gui.add(maxSpeed, 'value', 0, 10, 0.01).name('maxSpeed')
gui.add(velocityDamping, 'value', 0, 0.1, 0.001).name('velocityDamping')
gui.add(spinningStrength, 'value', 0, 10, 0.01).name('spinningStrength')
gui.add(scale, 'value', 0, 0.1, 0.001).name('scale')
gui.add(boundHalfExtent, 'value', 0, 20, 0.01).name('boundHalfExtent')
gui.addColor({ color: colorA.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorA.value.set(value) }).name('colorA')
gui.addColor({ color: colorB.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorB.value.set(value) }).name('colorB')
gui
    .add({ controlsMode: attractors[0].controls.mode }, 'controlsMode')
    .options(['translate', 'rotate', 'none'])
    .onChange(value =>
    {
        for(const attractor of attractors)
        {
            if(value === 'none')
            {
                attractor.controls.visible = false
                attractor.controls.enabled = false
            }
            else
            {
                attractor.controls.visible = true
                attractor.controls.enabled = true
                attractor.controls.mode = value
            }
        }
    })
gui
    .add({ helperVisible: attractors[0].helper.visible }, 'helperVisible')
    .onChange(value =>
    {
        for(const attractor of attractors)
            attractor.helper.visible = value
    })
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
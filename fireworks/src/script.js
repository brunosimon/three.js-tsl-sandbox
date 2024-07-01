import GUI from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { If, MeshBasicNodeMaterial, PointsNodeMaterial, SpriteNodeMaterial, add, cameraPosition, cameraProjectionMatrix, cameraViewMatrix, clamp, color, cond, cos, distance, float, frontFacing, hash, instanceIndex, length, mat2, min, mix, modelViewMatrix, modelWorldMatrix, mul, negate, normalWorld, positionGeometry, positionLocal, positionWorld, range, rotateUV, sin, smoothstep, step, storage, texture, timerDelta, timerGlobal, timerLocal, tslFn, uint, uniform, uv, varying, vec2, vec3, vec4 } from 'three/examples/jsm/nodes/Nodes.js'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import StorageInstancedBufferAttribute from 'three/examples/jsm/renderers/common/StorageInstancedBufferAttribute.js'

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

    // // Update fireflies
    // firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
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

debugObject.clearColor = '#231726'
renderer.setClearColor(debugObject.clearColor)
gui
    .addColor(debugObject, 'clearColor')
    .onChange(() =>
    {
        renderer.setClearColor(debugObject.clearColor)
    })


/**
 * Create firework
 */
const textures = [
    textureLoader.load('./particles/1.png'),
    textureLoader.load('./particles/2.png'),
    textureLoader.load('./particles/3.png'),
    textureLoader.load('./particles/4.png'),
    textureLoader.load('./particles/5.png'),
    textureLoader.load('./particles/6.png'),
    textureLoader.load('./particles/7.png'),
    textureLoader.load('./particles/8.png'),
]
const computes = []

const createFirework = () =>
{
    /**
    * Material
    */
    const material = new SpriteNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    const count = 400
    const duration = 4

    /**
    * Position
    */
    const positionBuffer = storage(new StorageInstancedBufferAttribute(count, 3), 'vec3', count)
    const velocityBuffer = storage(new StorageInstancedBufferAttribute(count, 3), 'vec3', count)
    const damperBuffer = storage(new StorageInstancedBufferAttribute(count, 1), 'float', count)

    // Compute init
    const particlesInit = tslFn(() =>
    {
        // Velocity
        const velocityElement = velocityBuffer.element(instanceIndex)
        velocityElement.assign(vec3(
            instanceIndex.hash(),
            instanceIndex.add(uint(Math.random() * 0xffffff)).hash(),
            instanceIndex.add(uint(Math.random() * 0xffffff)).hash()
        ).sub(0.5).mul(20))

        // damper
        const damperElement = damperBuffer.element(instanceIndex)
        damperElement.assign(instanceIndex.add(uint(Math.random() * 0xffffff)).hash().remap(0, 1, 0.05, 0.2))
    })

    const particlesInitCompute = particlesInit().compute(count)
    renderer.compute(particlesInitCompute)

    // Compute update
    const particlesUpdate = tslFn(() =>
    {
        const positionElement = positionBuffer.element(instanceIndex)
        const velocityElement = velocityBuffer.element(instanceIndex)
        const damperElement = damperBuffer.element(instanceIndex)
        
        const gravity = vec3(0, -0.015, 0)
        
        velocityElement.addAssign(gravity)
        velocityElement.mulAssign(damperElement.oneMinus())
        positionElement.addAssign(velocityElement.mul(timerDelta()))
    })

    computes.push(particlesUpdate().compute(count))

    material.positionNode = positionBuffer.toAttribute()

    /**
    * Scale
    */
    const scaleOscillation = sin(timerLocal(3).add(range(0, Math.PI * 2))).remap(-1, 1, 0.1, 1)
    const scaleLife = min(
        timerLocal().div(duration).remap(0, 0.1).smoothstep(0, 1),
        timerLocal().div(duration).remap(1, 0.5).smoothstep(0, 1)
    )
    material.scaleNode = scaleOscillation.mul(scaleLife).mul(0.2)

    /**
    * Color
    */
    const particleTexture = textures[Math.floor(Math.random() * textures.length)]
    const alpha = texture(particleTexture, rotateUV(uv(), range(-1, 1))).r.mul(2)
    const baseColor = new THREE.Color().setHSL(Math.random(), 1, 0.5)
    const offsetColor = baseColor.clone().offsetHSL(0.3, 0, 0)
    const finalColor = mix(baseColor, offsetColor, range(0, 1))
    material.colorNode = vec4(finalColor, alpha)

    /**
    * Mesh
    */
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material.clone(), count)
    mesh.position.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
    )
    scene.add(mesh)

    return mesh
}

/**
 * Fireworks
 */
window.addEventListener('click', () =>
{
    const mesh = createFirework()
    window.setTimeout(() =>
    {
        scene.remove(mesh)
    }, 4000)
})

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
    for(const compute of computes)
    {
        renderer.compute(compute)
    }
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
import GUI from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MeshBasicNodeMaterial, PI2, color, dot, rangeFog, sin, step, texture, timerGlobal, tslFn, uv, vec2, vec3, vec4 } from 'three/examples/jsm/nodes/Nodes.js'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import gridMaterial from './GridMaterial'

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
scene.fogNode = rangeFog(color('#1b191f'), 2, 15)

// Loaders
const textureLoader = new THREE.TextureLoader()

/**
 * Test
 */
// Texture
const cellularTexture = textureLoader.load('./Voronoi 1 - 256x256.png')
const perlinTexture = textureLoader.load('./perlinTexture.png')
const uvCheckerTexture = textureLoader.load('./uvCheckerByValle.jpg')

// Material
const material = new MeshBasicNodeMaterial({ transparent: true, side: THREE.DoubleSide })

const spherizeUv = tslFn(([input, center, strength, offset]) =>
{
    const delta = input.sub(center)
    const delta2 = dot(delta, delta)
    const delta4 = delta2.mul(delta2)
    const deltaOffset = delta4.mul(strength)
    return input.add(delta.mul(deltaOffset)).add(offset)
})

material.colorNode = tslFn(() =>
{
    const time = timerGlobal(1)

    // Main UV
    const mainUv = uv().toVar()
    mainUv.assign(spherizeUv(mainUv, vec2(0.5), 10, vec2(0)).mul(0.6).add(0.2)) // Spherize
    mainUv.assign(mainUv.pow(vec2(1, 3))) // Stretch
    mainUv.assign(mainUv.mul(2, 1).sub(vec2(0.5, 0))) // Scale

    // Perlin noise
    const perlinUv = mainUv.add(vec2(0, time.negate().mul(1))).mod(1)
    const perlinNoise = texture(perlinTexture, perlinUv, 0).sub(0.5).mul(1)
    mainUv.x.addAssign(perlinNoise.x.mul(0.5))

    // Gradients
    const gradient1 = sin(time.mul(10).sub(mainUv.y.mul(PI2).mul(2)))
    const gradient2 = mainUv.y.smoothstep(0, 1)
    const gradient3 = mainUv.y.smoothstep(1, 0.7)
    mainUv.x.addAssign(gradient1.mul(gradient2).mul(0.2))

    // Displaced perlin noise
    const displacementPerlinUv = mainUv.mul(0.5).add(vec2(0, time.negate().mul(0.25))).mod(1)
    const displacementPerlinNoise = texture(perlinTexture, displacementPerlinUv, 0).sub(0.5).mul(1)
    const displacedPerlinUv = mainUv.add(vec2(0, time.negate().mul(0.5))).add(displacementPerlinNoise).mod(1)
    const displacedPerlinNoise = texture(perlinTexture, displacedPerlinUv, 0).sub(0.5).mul(1)
    mainUv.x.addAssign(displacedPerlinNoise.mul(0.5))

    // Cellular noise
    const cellularUv = mainUv.add(vec2(0, time.negate().mul(1.5))).mod(1)
    const cellularNoise = texture(cellularTexture, cellularUv, 0).r.oneMinus().smoothstep(0.25, 1)

    // Shape
    const shape = mainUv.sub(0.5).mul(vec2(6, 1)).length().step(0.5)
    shape.assign(shape.mul(cellularNoise))
    shape.mulAssign(gradient3)
    shape.assign(step(0.01, shape))

    // Output
    return vec4(vec3(1), shape)
})()

// Geometry
const geometry = new THREE.PlaneGeometry(1, 1, 64, 64)

// Mesh
const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    gridMaterial
)
floor.rotation.x = - Math.PI * 0.5
floor.position.y = - 1
scene.add(floor)

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
camera.position.x = 1
camera.position.y = 1
camera.position.z = 3
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
renderer.setClearColor('#000000')

debugObject.clearColor = '#201919'
renderer.setClearColor(debugObject.clearColor)
gui
    .addColor(debugObject, 'clearColor')
    .onChange(() =>
    {
        renderer.setClearColor(debugObject.clearColor)
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
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
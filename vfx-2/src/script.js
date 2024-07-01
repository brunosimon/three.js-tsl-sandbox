import GUI from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MeshBasicNodeMaterial, PI, PI2, color, dot, mix, positionLocal, rangeFog, sin, step, texture, timerGlobal, tslFn, uv, vec2, vec3, vec4 } from 'three/examples/jsm/nodes/Nodes.js'
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
 * VFX
 */
// Canvas
const gradient = {}
gradient.element = document.createElement('canvas')
gradient.element.width = 128
gradient.element.height = 1
gradient.context = gradient.element.getContext('2d')

gradient.colors = [
    '#090033',
    '#5f1f93',
    '#e02e96',
    '#ffbd80',
    '#fff0db',
]

gradient.texture = new THREE.CanvasTexture(gradient.element)
gradient.texture.colorSpace = THREE.SRGBColorSpace

gradient.update = () =>
{
    const fillGradient = gradient.context.createLinearGradient(0, 0, gradient.element.width, 0)

    for(let i = 0; i < gradient.colors.length; i++)
    {
        const progress = i / (gradient.colors.length - 1)
        const color = gradient.colors[i]
        fillGradient.addColorStop(progress, color)
    }

    gradient.context.fillStyle = fillGradient
    gradient.context.fillRect(0, 0, gradient.element.width, gradient.element.height)
    
    gradient.texture.needsUpdate = true
}

gradient.update()

const gradientFolder = gui.addFolder('🎨 gradient')
for(let i = 0; i < gradient.colors.length; i++)
    gradientFolder.addColor(gradient.colors, i).name(`color${i}`).onChange(gradient.update)

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
    mainUv.assign(mainUv.pow(vec2(1, 2))) // Stretch
    mainUv.assign(mainUv.mul(2, 1).sub(vec2(0.5, 0))) // Scale

    // Gradients
    const gradient1 = sin(time.mul(10).sub(mainUv.y.mul(PI2).mul(2)))
    const gradient2 = mainUv.y.smoothstep(0, 1)
    mainUv.x.addAssign(gradient1.mul(gradient2).mul(0.2))

    // Cellular noise
    const cellularUv = mainUv.mul(0.5).add(vec2(0, time.negate().mul(0.5))).mod(1)
    const cellularNoise = texture(cellularTexture, cellularUv, 0).r.oneMinus().smoothstep(0, 0.5).oneMinus()
    cellularNoise.mulAssign(gradient2)

    // Shape
    const shape = mainUv.sub(0.5).mul(vec2(3, 2)).length().oneMinus()
    shape.assign(shape.sub(cellularNoise))

    // Gradient color
    const gradientColor = texture(gradient.texture, vec2(shape.remap(0, 1, 0, 1), 0))

    // Output
    const color = mix(gradientColor, vec3(1), shape.step(0.8).oneMinus())
    const alpha = shape.smoothstep(0, 0.3)
    return vec4(color.rgb, alpha)
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
floor.position.y = - 0.5
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
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 1
camera.position.y = 0.5
camera.position.z = 2.5
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
import GUI from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { SpriteNodeMaterial, color, cos, float, mix, range, sin, timerGlobal, uniform, uv, vec3, vec4 } from 'three/examples/jsm/nodes/Nodes.js'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'

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

/**
 * Galaxy
 */
const particlesMaterial = new SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
})

// Scale
particlesMaterial.scaleNode = range(0.001, 0.08)

// Position
const time = timerGlobal(0.5)

const radiusRatio = range(0, 1)
const radius = radiusRatio.pow(1.5).mul(5)

const branchAngle = range(0, 3).floor().mul(Math.PI * 2 / 3)
const angle = branchAngle.add(time.mul(radiusRatio.oneMinus()))

const position = vec3(
    cos(angle),
    0,
    sin(angle)
).mul(radius)

const random = range(vec3(-1), vec3(1)).pow(3).mul(radiusRatio).add(0.2)

particlesMaterial.positionNode = position.add(random)

// Color
const colorInside = uniform(color('#ffa575'))
const colorOutside = uniform(color('#6a1599'))
const colorFinal = mix(colorInside, colorOutside, radiusRatio.oneMinus().pow(2).oneMinus())
const alpha = float(0.1).div(uv().sub(0.5).length()).sub(0.2)
particlesMaterial.colorNode = vec4(colorFinal, alpha)

// Mesh
const particles = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), particlesMaterial)
particles.isInstancedMesh = true
particles.count = 4000
scene.add(particles)

// Debug
gui.addColor({ color: colorInside.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => { colorInside.value.set(value) })
gui.addColor({ color: colorOutside.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => { colorOutside.value.set(value) })

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
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 4
camera.position.y = 2
camera.position.z = 4
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
    // Update controls
    controls.update()

    // Render
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
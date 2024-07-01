import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import { MeshStandardNodeMaterial, color, normalWorld, positionLocal, uniform, vec4 } from 'three/examples/jsm/nodes/Nodes.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

const colorBottom = new THREE.Color('#5f1f93')
const colorTop = new THREE.Color('#ffbd80')

gui.addColor({ colorBottom: colorBottom.getHexString(THREE.SRGBColorSpace) }, 'colorBottom').onChange(value => { colorBottom.set(value) })
gui.addColor({ colorTop: colorTop.getHexString(THREE.SRGBColorSpace) }, 'colorTop').onChange(value => { colorTop.set(value) })

scene.backgroundNode = normalWorld.y.smoothstep(-1, 1).mix(uniform(colorBottom), uniform(colorTop))

/**
 * Test
 */
const material = new MeshStandardNodeMaterial()

const geometry = new THREE.SphereGeometry(2, 32, 32)
const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.HemisphereLight(null, null, 1)
ambientLight.color = colorTop
ambientLight.groundColor = colorBottom
scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight('#ffffff', 2)
directionalLight.position.set(4, 2, 0)
scene.add(directionalLight)

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
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4, 2, 5)
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
renderer.setClearColor('#000000')

/**
 * Animate
 */
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
import GUI from 'lil-gui'
import * as THREE from 'three/webgpu'
import { sin, positionLocal, time, vec2, vec3, vec4, uv, uniform, color, fog, rangeFogFactor, pass, renderOutput, Fn, hash, add, step } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { sobel } from 'three/addons/tsl/display/SobelOperatorNode.js';

/**
 * Base
 */
// Debug
const gui = new GUI({
    width: 400
})

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
const renderer = new THREE.WebGPURenderer({
    canvas: canvas,
    forceWebGL: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000000)

/**
 * Dummy
 */
// Material
const material = new THREE.MeshBasicNodeMaterial()

// Uniforms
const progress = uniform(0.5)
gui.add(progress, 'value').min(0).max(1).name('progress')

// Color
material.colorNode = Fn(() =>
{
    const cellUv = uv().mul(10)
    const cellUvRepeat = cellUv.fract()
    const cellUvRound = cellUv.floor()
    const cellHash = hash(cellUvRound.x.add(cellUvRound.y.mul(123.456)))

    return vec3(cellUvRepeat.xy, cellHash)
})()

// Mesh
const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 4),
    material
)
scene.add(mesh)

/**
 * Animate
 */
const tick = () =>
{
    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)
}
renderer.setAnimationLoop(tick)
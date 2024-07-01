import GUI from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { If, min, MeshBasicNodeMaterial, SpriteNodeMaterial, color, range, sin, instanceIndex, timerDelta, smoothstep, step, timerGlobal, tslFn, uniform, uv, vec3, vec4, positionWorld, vec2, normalWorld, mix, max, rangeFog, densityFog, uint, hash, float, viewportDepthTexture, depthTexture, viewportSharedTexture, pass, cameraNear, cameraFar } from 'three/examples/jsm/nodes/Nodes.js'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import { storage } from 'three/examples/jsm/nodes/Nodes.js'
import StorageInstancedBufferAttribute from 'three/examples/jsm/renderers/common/StorageInstancedBufferAttribute.js'
import { simplexNoise4d } from './tsl/simplexNoise4d.js'
import { GLTFLoader, Wireframe } from 'three/examples/jsm/Addons.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import gridMaterial from './GridMaterial.js'
import { MeshStandardNodeMaterial } from 'three/examples/jsm/nodes/Nodes.js'
import PostProcessing from 'three/examples/jsm/renderers/common/PostProcessing.js'

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
const camera = new THREE.PerspectiveCamera(15, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 5
camera.position.y = 2
camera.position.z = 6
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
 * Focus point
 */
const focusPoint = new THREE.Object3D()
scene.add(focusPoint)

const focusPointControls = new TransformControls(camera, renderer.domElement)
focusPointControls.attach(focusPoint)
scene.add(focusPointControls)

focusPointControls.addEventListener('change', (event) =>
{
    focusDistance.value = camera.position.distanceTo(focusPoint.position)
})

focusPointControls.addEventListener('dragging-changed', (event) =>
{
    cameraControls.enabled = !event.value
})

/**
 * Post processing
 */
const postProcessing = new PostProcessing(renderer)

// Color
const colorPass = pass(scene, camera)

// Depth
const depthPass = colorPass.getDepthNode()
const absoluteDepth = depthPass.mul(camera.far - camera.near)
const colorPassNode = colorPass.getTextureNode();

// Focus blur
const focusDistance = uniform(camera.position.distanceTo(focusPoint.position))
const focusAmplitude = uniform(5)
const focusStart = uniform(1)
const blurMax = uniform(3)
const blurMultiplier = uniform(1.5)

const focus = absoluteDepth.sub(focusDistance).abs().smoothstep(focusStart, focusStart.add(focusAmplitude))
const blur = focus.mul(blurMultiplier).min(blurMax)
const focusBlurPass = colorPassNode.gaussianBlur(4)
focusBlurPass.directionNode = blur

// Output
postProcessing.outputNode = focusBlurPass

gui.add(focusStart, 'value', 0, 10, 0.001).name('focusStart')
gui.add(focusAmplitude, 'value', 0, 10, 0.001).name('focusAmplitude')
gui.add(blurMax, 'value', 0, 10, 0.001).name('blurMax')
gui.add(blurMultiplier, 'value', 0, 10, 0.001).name('blurMultiplier')

/**
 * Scenery
 */
const sceneryMaterial = new MeshStandardNodeMaterial()
const sceneryGeoemtry = new THREE.BoxGeometry(1, 1, 1)
sceneryGeoemtry.translate(0, 0.5, 0)
const cubeA = new THREE.Mesh(sceneryGeoemtry, sceneryMaterial)
cubeA.scale.setScalar(0.5)

const cubeB = new THREE.Mesh(sceneryGeoemtry, sceneryMaterial)
cubeB.scale.setScalar(0.75)
cubeB.position.set(-0.5, 0, -1)

const cubeC = new THREE.Mesh(sceneryGeoemtry, sceneryMaterial)
cubeC.scale.setScalar(0.25)
cubeC.position.set(2, 0, 2)

const cubeD = new THREE.Mesh(sceneryGeoemtry, sceneryMaterial)
cubeD.scale.setScalar(0.5)
cubeD.position.set(0.5, 0, 1.5)

scene.add(cubeA, cubeB, cubeC, cubeD)

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
directionalLight.position.set(3, 2, 1)
scene.add(directionalLight)

const ambientLight = new THREE.AmbientLight('#ffffff', 0.5)
scene.add(ambientLight)

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    gridMaterial
)
floor.rotation.x = - Math.PI * 0.5
floor.position.y = 0
scene.add(floor)

scene.fogNode = rangeFog(color('#1b191f'), 20, 30)

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    // Update camera controls
    cameraControls.update()

    // Render
    // renderer.renderAsync(scene, camera)
    postProcessing.renderAsync()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
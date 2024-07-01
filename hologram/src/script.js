import GUI from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { If, MeshBasicNodeMaterial, PointsNodeMaterial, SpriteNodeMaterial, add, cameraPosition, clamp, color, cond, cos, distance, float, frontFacing, hash, length, mat2, min, mix, modelViewMatrix, modelWorldMatrix, mul, negate, normalView, normalWorld, positionLocal, positionWorld, range, sin, smoothstep, step, texture, timerGlobal, tslFn, uniform, uv, varying, vec2, vec3, vec4 } from 'three/examples/jsm/nodes/Nodes.js'
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

// Loaders
const gltfLoader = new GLTFLoader()

/**
 * Material
 */
const material = new MeshBasicNodeMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
})

// Position
const worldPosition = modelWorldMatrix.mul(positionLocal)

const glitchTime = timerGlobal().sub(worldPosition.y.mul(0.5))
const glitch = add(
    sin(glitchTime),
    sin(glitchTime.mul(3.45)),
    sin(glitchTime.mul(8.76))
).div(3).smoothstep(0.3, 1)

const glitchOffset = vec3(
    hash(worldPosition.xz.abs().mul(9999)).sub(0.5),
    0,
    hash(worldPosition.yx.abs().mul(9999)).sub(0.5),
).mul(glitch.mul(0.5))

const position = positionLocal.add(glitchOffset)

material.positionNode = position

// Color
const colorInside = uniform(color('#ff6088'))
const colorOutside = uniform(color('#4d55ff'))

material.colorNode = tslFn(() =>
{
    const position = positionWorld

    const stripes = position.y.sub(timerGlobal(0.02)).mul(20).mod(1).pow(3)

    const fresnel = normalView.dot(vec3(0, 0, 1)).abs().oneMinus()
    const falloff = fresnel.smoothstep(0.8, 0.2)
    const alpha = stripes.mul(fresnel).add(fresnel.mul(1.25)).mul(falloff)
    const finalColor = mix(colorInside, colorOutside, fresnel.add(glitch.mul(0.6)))

    return vec4(finalColor, alpha)
})()

// Debug
gui.addColor({ color: colorInside.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => colorInside.value.set(value))
gui.addColor({ color: colorOutside.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => colorOutside.value.set(value))

/**
 * Objects
 */
// Torus knot
const torusKnot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32),
    material
)
torusKnot.position.x = 3
scene.add(torusKnot)

// Sphere
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    material
)
sphere.position.x = - 3
scene.add(sphere)

// Suzanne
let suzanne = null
gltfLoader.load(
    './suzanne.glb',
    (gltf) =>
    {
        suzanne = gltf.scene
        suzanne.traverse((child) =>
        {
            if(child.isMesh)
                child.material = material
        })
        scene.add(suzanne)
    }
)

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
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import { float, loop, MeshBasicNodeMaterial, MeshStandardNodeMaterial, mix, normalMap, output, parallaxUV, positionLocal, step, texture, tslFn, uniform, uv, vec3, vec4 } from 'three/examples/jsm/nodes/Nodes.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const textureLoader = new THREE.TextureLoader()

/**
 * Test
 */
// Textures
const colorTexture = textureLoader.load('./Stylized_Lava_Rocks_001_SD/color.jpg')
colorTexture.colorSpace = THREE.SRGBColorSpace
colorTexture.wrapS = THREE.RepeatWrapping
colorTexture.wrapT = THREE.RepeatWrapping

const heightTexture = textureLoader.load('./Stylized_Lava_Rocks_001_SD/height.png')
heightTexture.wrapS = THREE.RepeatWrapping
heightTexture.wrapT = THREE.RepeatWrapping

const normalTexture = textureLoader.load('./Stylized_Lava_Rocks_001_SD/normal.jpg')
normalTexture.wrapS = THREE.RepeatWrapping
normalTexture.wrapT = THREE.RepeatWrapping

// Material
const material = new MeshStandardNodeMaterial()

// Uniforms
// const parallaxOffset = uniform(0.2)
// const parallaxMultiplier = uniform(0.1)

// gui.add(parallaxOffset, 'value', 0, 1, 0.001).name('parallaxOffset')
// gui.add(parallaxMultiplier, 'value', 0, 1, 0.001).name('parallaxMultiplier')

// Color
material.colorNode = tslFn(() =>
{
    const parallaxUV1 = parallaxUV(uv(), 1)
    // const finalColor = texture(colorTexture, parallaxUV1)
    const finalColor = vec4(1).toVar()
    const height = texture(heightTexture, uv())

    // loop({ start: 0, end: 10 }, ({ i }) =>
    // {
    //     const progress = i.div(10)
    //     finalColor.assign(mix(finalColor, texture(colorTexture, parallaxUV(uv(), float(1).sub(progress))), step(progress, height.r)))
    // })


    // finalColor.rgb.addAssign(step(0.0, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.1, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.2, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.3, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.4, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.5, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.6, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.7, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.8, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.9, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(  1, height.r).mul(0.1))

    finalColor.assign(mix(finalColor, texture(colorTexture, parallaxUV(uv(), 0.10)), step(0, height.r)))
    finalColor.assign(mix(finalColor, texture(colorTexture, parallaxUV(uv(), 0.09)), step(0.1, height.r)))
    finalColor.assign(mix(finalColor, texture(colorTexture, parallaxUV(uv(), 0.08)), step(0.2, height.r)))
    finalColor.assign(mix(finalColor, texture(colorTexture, parallaxUV(uv(), 0.07)), step(0.3, height.r)))
    finalColor.assign(mix(finalColor, texture(colorTexture, parallaxUV(uv(), 0.06)), step(0.4, height.r)))
    finalColor.assign(mix(finalColor, texture(colorTexture, parallaxUV(uv(), 0.05)), step(0.5, height.r)))
    finalColor.assign(mix(finalColor, texture(colorTexture, parallaxUV(uv(), 0.04)), step(0.6, height.r)))
    finalColor.assign(mix(finalColor, texture(colorTexture, parallaxUV(uv(), 0.03)), step(0.7, height.r)))
    finalColor.assign(mix(finalColor, texture(colorTexture, parallaxUV(uv(), 0.02)), step(0.8, height.r)))
    finalColor.assign(mix(finalColor, texture(colorTexture, parallaxUV(uv(), 0.01)), step(0.9, height.r)))

    // finalColor.rgb.addAssign(step(0.0, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.1, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.2, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.3, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.4, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.5, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.6, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.7, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.8, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(0.9, height.r).mul(0.1))
    // finalColor.rgb.addAssign(step(  1, height.r).mul(0.1))

    return finalColor
})()

// // Normal
// material.normalNode = normalMap(texture(normalTexture, parallaxedUV))

// // Output
// material.outputNode = mix(texture(colorTexture, parallaxedUV), output, texture(heightTexture))

// Geometry
const geometry = new THREE.PlaneGeometry(1, 1)

// Mesh
const mesh = new THREE.Mesh(geometry, material)
mesh.rotation.x = - Math.PI * 0.5
scene.add(mesh)

/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.AmbientLight('#ffffff', 0.5)
scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight('#ffffff', 3.5)
directionalLight.position.set(1, 1.5, 2)
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
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0.5, 2, 1)
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
const timer = new Timer()

const tick = () =>
{
    // Timer
    timer.update()
    const elapsedTime = timer.getElapsed()

    // Update controls
    controls.update()

    // Render
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
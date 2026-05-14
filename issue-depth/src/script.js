import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { add, attribute, attributeArray, cameraFar, cameraNear, cameraPosition, cameraProjectionMatrix, cameraViewMatrix, color, cos, cross, deltaTime, diffuseColor, dot, exp, float, Fn, frontFacing, If, instancedArray, instanceIndex, linearDepth, luminance, mat2, materialColor, materialEmissive, max, min, mix, mul, mx_noise_float, nodeObject, normalize, normalMap, normalWorld, pass, TWO_PI, positionGeometry, positionView, positionViewDirection, positionWorld, positionWorldDirection, rand, range, reflect, rotate, screenCoordinate, screenUV, select, sin, step, texture, time, transformNormalToView, uniform, uv, varying, vec2, vec3, vec4, vertexStage, viewport, viewportLinearDepth, viewportSafeUV, viewportSharedTexture, viewportDepthTexture, depth } from 'three/tsl'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { hashBlur } from 'three/examples/jsm/tsl/display/hashBlur.js'
import { GLTFLoader, TransformControls } from 'three/examples/jsm/Addons.js'
import { lerp } from 'three/src/math/MathUtils.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.threejs')

// Scene
const scene = new THREE.Scene()

// Loaders
const textureLoader = new THREE.TextureLoader()
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
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 8
camera.position.y = 4.5
camera.position.z = 6
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0, 0)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000000)

/**
 * Textures
 */
const colorTexture = textureLoader.load('./floor-color.jpg')
const dataTexture = textureLoader.load('./floor-data.png')
colorTexture.colorSpace = THREE.SRGBColorSpace

/**
 * Floor
 */
{
    // Geometry
    const geometry = new THREE.PlaneGeometry(10, 10, 20, 20)
    geometry.rotateX(- Math.PI * 0.5)

    // Material
    const material = new THREE.MeshBasicNodeMaterial({ map: colorTexture })

    material.positionNode = Fn(() =>
    {
        const dataColor = texture(dataTexture)
        const newPosition = positionGeometry.toVar()

        // Elevation
        const elevation = dataColor.r
        newPosition.y.addAssign(elevation)

        return newPosition
    })()

    // Mesh
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
}

/**
 * Water
 */
{
    const geometry = new THREE.PlaneGeometry(10, 10)
    geometry.rotateX(- Math.PI * 0.5)

    const material = new THREE.NodeMaterial({ transparent: true })

    material.backdropNode = Fn(() =>
    {
        // Distant depth should stay white, even if the value grows slower
        // It's like it's being clamped to 1
        // const waterDepth = depth.mul(0.5)

        // Same. viewportDepthTexture() seems to be clamped to 1
        // const waterDepth = viewportDepthTexture().mul(0.5)

        // The water depth should stay the same, regardless of the distance of the camera
        // But the value varies unpredictably 
        const waterDepth = viewportDepthTexture().sub(depth) // Water depth shouldn't vary on camera proximity

        return vec3(waterDepth, waterDepth, waterDepth)
    })()

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = 0.65
    scene.add(mesh)
}

/**
 * Debug planes
 */
{
    const zPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10, 10, 10),
        new THREE.MeshBasicMaterial({ wireframe: true, color: 0xffff00 }),
    )
    zPlane.position.y += 1
    scene.add(zPlane)

    const yPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10, 10, 10),
        new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff00ff }),
    )
    yPlane.position.y += 1
    yPlane.rotation.x = - Math.PI * 0.5
    scene.add(yPlane)
}

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

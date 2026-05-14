import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { add, attribute, attributeArray, cameraFar, cameraNear, cameraPosition, cameraProjectionMatrix, cameraViewMatrix, color, cos, cross, deltaTime, diffuseColor, dot, exp, float, Fn, frontFacing, If, instancedArray, instanceIndex, linearDepth, luminance, mat2, materialColor, materialEmissive, max, min, mix, mul, mx_noise_float, nodeObject, normalize, normalMap, normalWorld, pass, TWO_PI, positionGeometry, positionView, positionViewDirection, positionWorld, positionWorldDirection, rand, range, reflect, rotate, screenCoordinate, screenUV, select, sin, step, texture, time, transformNormalToView, uniform, uv, varying, vec2, vec3, vec4, vertexStage, viewport, viewportLinearDepth, viewportSafeUV, viewportSharedTexture, viewportDepthTexture, depth, positionLocal, modelWorldMatrix } from 'three/tsl'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { hashBlur } from 'three/examples/jsm/tsl/display/hashBlur.js'
import { GLTFLoader, TransformControls } from 'three/examples/jsm/Addons.js'

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
 * Model
 */
const model = await gltfLoader.loadAsync('./Michelle.glb')
scene.add(model.scene)
model.scene.scale.setScalar(3)
model.scene.position.y = - 2

model.scene.traverse((child) =>
{
    if(child instanceof THREE.Mesh)
    {
        child.material = new THREE.MeshBasicNodeMaterial()
        
        child.material.positionNode = Fn(() =>
        {
            const newPosition = positionLocal.toVar()

            newPosition.x.addAssign(positionWorld.y.mul(4).sin().mul(0.2))

            return newPosition
        })()

        // child.material.vertexNode = Fn(() =>
        // {
        //     const worldPosition = modelWorldMatrix.mul(positionLocal).toVar()

        //     worldPosition.x.addAssign(worldPosition.y.mul(4).sin().mul(0.2))

        //     return cameraProjectionMatrix.mul(cameraViewMatrix).mul(worldPosition)
        // })()

        
        child.material.colorNode = Fn(() =>
        {
            return positionWorld
        })()
    }
})

const mixer = new THREE.AnimationMixer(model.scene)
const action = mixer.clipAction(model.animations[0])
action.play()

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight(0xffffff, 3)
directionalLight.castShadow = true
directionalLight.position.set(4, 2, 1).normalize().multiplyScalar(10)
directionalLight.shadow.radius = 5
directionalLight.shadow.normalBias = 0.1
scene.add(directionalLight)

const ambientLight = new THREE.AmbientLight(0x859dff, 0.5)
scene.add(ambientLight)

/**
 * Animate
 */
const timer = new THREE.Timer()

const tick = () =>
{
    timer.update()
    const elapsedTime = timer.getElapsed()

    // Animation
    mixer.update(timer.getDelta() * 0.2)

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)
}

renderer.setAnimationLoop(tick)

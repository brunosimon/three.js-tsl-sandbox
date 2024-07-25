import GUI from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshBasicNodeMaterial, mix, mul, positionLocal, smoothstep, texture, timerGlobal, tslFn, uv, vec2, vec3, vec4 } from 'three/examples/jsm/nodes/Nodes.js'
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
const textureLoader = new THREE.TextureLoader()
const gltfLoader = new GLTFLoader()

/**
 * Smoke geometry
 */
const smokeGeometry = new THREE.PlaneGeometry(1, 1, 16, 64)
smokeGeometry.translate(0, 0.5, 0)
smokeGeometry.scale(1.5, 6, 1.5)

/**
 * Smoke material
 */
// Texture
const noiseTexture = textureLoader.load('./noise.png')
noiseTexture.wrapS = THREE.RepeatWrapping
noiseTexture.wrapT = THREE.RepeatWrapping

// Material
const smokeMaterial = new MeshBasicNodeMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false })

// Position
smokeMaterial.positionNode = tslFn(() =>
{
    const time = timerGlobal()

    // Twist
    const twistNoiseUv = vec2(0.5, uv().y.mul(0.2).sub(time.mul(0.005)).mod(1))
    const twist = texture(noiseTexture, twistNoiseUv).r.mul(10)
    positionLocal.xz.assign(positionLocal.xz.rotateUV(twist, vec2(0)))

    // Wind
    const windOffset = vec2(
        texture(noiseTexture, vec2(0.25, time.mul(0.01)).mod(1)).r.sub(0.5),
        texture(noiseTexture, vec2(0.75, time.mul(0.01)).mod(1)).r.sub(0.5),
    ).mul(uv().y.pow(2).mul(10))
    positionLocal.addAssign(windOffset)

    return positionLocal
})()

// Color
smokeMaterial.colorNode = tslFn(() =>
{
    const time = timerGlobal()

    const alphaNoiseUv = uv().mul(vec2(0.5, 0.3)).add(vec2(0, time.mul(0.03).negate()))
    const alpha = mul(
        texture(noiseTexture, alphaNoiseUv).r.smoothstep(0.4, 1),
        smoothstep(0, 0.1, uv().x),
        smoothstep(1, 0.9, uv().x),
        smoothstep(0, 0.1, uv().y),
        smoothstep(1, 0.9, uv().y)
    )
    const finalColor = mix(vec3(0.6, 0.3, 0.2), vec3(1, 1, 1), alpha.pow(3))

    return vec4(finalColor, alpha)
})()

// Mesh
const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial)
smoke.position.y = 1.83
scene.add(smoke)


/**
 * Model
 */
gltfLoader.load(
    './bakedModel.glb',
    (gltf) =>
    {
        gltf.scene.getObjectByName('baked').material.map.anisotropy = 8
        scene.add(gltf.scene)
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
camera.position.x = 8
camera.position.y = 10
camera.position.z = 12
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.y = 3
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
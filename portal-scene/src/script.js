import * as THREE from 'three/webgpu'
import { float, /*depthTexture, viewportDepthTexture,*/ sqrt, vec2, vec3, vec4, viewportResolution, viewportSharedTexture, viewportTopLeft, range, tslFn, instanceIndex, modelWorldMatrix, cameraProjectionMatrix, cameraFar, uv, step, max, uniform, color, cameraNear, positionLocal, modelViewMatrix, timerGlobal, sin } from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { Timer } from 'three/addons/Addons.js'
import GUI from 'lil-gui'

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

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Textures
 */
const bakedTexture = textureLoader.load('baked.jpg')
bakedTexture.flipY = false
bakedTexture.colorSpace = THREE.SRGBColorSpace

/**
 * Fireflies
 */
const firefliesMaterial = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false })

const firefliesColor = uniform(color('#ffdb9e'))
gui.addColor({ color: firefliesColor.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange(value => firefliesColor.value.set(value))

const baseScale = range(0.04, 0.2)

const x = range(-2, 2)
let y = range(0, 4)
const z = range(-2, 2)

y = y.add(sin(timerGlobal(0.2).add(instanceIndex.hash().mul(99))).mul(baseScale).mul(2))

/* Start: stuff I stolen from SpriteNodeMaterial, mixed with sunag code and don't understand */
let modelViewPosition = modelViewMatrix.mul(vec3(x, y, z))
const scale = vec2(modelWorldMatrix[0].xyz.length(), modelWorldMatrix[1].xyz.length()).mul(baseScale)
const alignedPosition = positionLocal.xy.mul(scale)

modelViewPosition = vec4(modelViewPosition.xy.add(alignedPosition), modelViewPosition.zw)

const modelViewProjection = cameraProjectionMatrix.mul(modelViewPosition)

firefliesMaterial.vertexNode = modelViewProjection

const customLinearDepth = modelViewProjection.w.varying().sub(cameraNear).div(cameraFar)
/* End: stuff I stolen from SpriteNodeMaterial, mixed with sunag code and don't understand */

firefliesMaterial.backdropNode = viewportSharedTexture(viewportTopLeft.xy)

// firefliesMaterial.backdropAlphaNode = tslFn(() =>
// {
//     const relativeDepth = depthTexture(viewportDepthTexture()).sub(customLinearDepth)
//     const depthAlpha = relativeDepth.smoothstep(0, 0.002)
//     return depthAlpha.oneMinus()
// })()

firefliesMaterial.colorNode = tslFn(() =>
{
    const distanceToCenter = uv().sub(0.5).length()
    
    const alpha = float(0.01).div(distanceToCenter).sub(0.02).clamp(0, 1)
    alpha.assign(max(alpha, step(distanceToCenter, 0.1)))

    const finalColor = alpha.mix(firefliesColor, vec3(1))

    return vec4(finalColor, alpha)
})()

const fireflyGeometry = new THREE.PlaneGeometry(1, 1)

const fireflies = new THREE.InstancedMesh(fireflyGeometry, firefliesMaterial, 50)
scene.add(fireflies)

/**
 * Portal
 */
const portalMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide, transparent: true })

// Sobel
// From: https://gist.github.com/Hebali/6ebfc66106459aacee6a9fac029d0115
const w = float(1).div(viewportResolution.x)
const h = float(1).div(viewportResolution.y)

const n0 = viewportSharedTexture(viewportTopLeft.xy.add(vec2(w.negate(), h.negate())))
const n1 = viewportSharedTexture(viewportTopLeft.xy.add(vec2(0.0, h.negate())))
const n2 = viewportSharedTexture(viewportTopLeft.xy.add(vec2(w, h.negate())))
const n3 = viewportSharedTexture(viewportTopLeft.xy.add(vec2(w.negate(), 0.0)))
const n5 = viewportSharedTexture(viewportTopLeft.xy.add(vec2(w, 0.0)))
const n6 = viewportSharedTexture(viewportTopLeft.xy.add(vec2(w.negate(), h)))
const n7 = viewportSharedTexture(viewportTopLeft.xy.add(vec2(0.0, h)))
const n8 = viewportSharedTexture(viewportTopLeft.xy.add(vec2(w, h)))

const sobel_edge_h = n2.add(n5.mul(2)).add(n8).sub(n0.add(n3.mul(2)).add(n6))
const sobel_edge_v = n0.add(n1.mul(2)).add(n2).sub(n6.add(n7.mul(2)).add(n8))
const sobel = sqrt((sobel_edge_h.mul(sobel_edge_h)).add(sobel_edge_v.mul(sobel_edge_v)))

// Backdrop
portalMaterial.backdropNode = vec4(vec3(sobel.rgb.pow(2)), 1)

/**
 * Model
 */
// Baked material
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })

// Pole light material
const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })

// Load
gltfLoader.load(
    'portal.glb',
    (gltf) =>
    {
        scene.add(gltf.scene)

        // Get each object
        const bakedMesh = gltf.scene.children.find((child) => child.name === 'baked')
        const portalLightMesh = gltf.scene.children.find((child) => child.name === 'portalLight')
        const poleLightAMesh = gltf.scene.children.find((child) => child.name === 'poleLightA')
        const poleLightBMesh = gltf.scene.children.find((child) => child.name === 'poleLightB')

        // Apply materials
        bakedMesh.material = bakedMaterial
        portalLightMesh.material = portalMaterial
        poleLightAMesh.material = poleLightMaterial
        poleLightBMesh.material = poleLightMaterial
    }
)

/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.AmbientLight('#ffffff', 0.5)
scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight('#ffffff', 1.5)
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
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.set(3, 2, 3)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.y = 0.5
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
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

    // // Fireflies
    // for(const _firefly of fireflies)
    // {
    //     _firefly.position.y = 1 + Math.sin(elapsedTime * 0.05 + _firefly.position.x * 100.0) * 2 * _firefly.scale.x;
    //     _firefly.lookAt(camera.position)
    // }

    // Update controls
    controls.update()

    // Render
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
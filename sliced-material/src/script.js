import * as THREE from 'three/webgpu'
import GUI from 'lil-gui'
import { If, PI2, atan2, color, frontFacing, output, positionLocal, tslFn, uniform, vec4 } from 'three/webgpu'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

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
const rgbeLoader = new RGBELoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('./draco/')
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Material
 */
const defaultMaterial = new THREE.MeshPhysicalNodeMaterial({
    metalness: 0.5,
    roughness: 0.25,
    envMapIntensity: 0.5,
    color: '#858080'
})
const slicedMaterial = new THREE.MeshPhysicalNodeMaterial({
    metalness: 0.5,
    roughness: 0.25,
    envMapIntensity: 0.5,
    color: '#858080',
    side: THREE.DoubleSide
})

// Uniforms
const sliceStart = uniform(1.75)
const sliceArc = uniform(1.25)
const sliceColor = uniform(color('#b62f58'))

const inAngle = tslFn(() =>
{
    const angle = atan2(positionLocal.y, positionLocal.x).sub(sliceStart).mod(PI2)
    return angle.greaterThan(0).and(angle.lessThan(sliceArc))
})

// Color and discard
slicedMaterial.outputNode = tslFn(() =>
{
    // Discard
    inAngle().discard()

    // Backface color
    const finalOutput = output
    If(frontFacing.not(), () =>
    {
        finalOutput.assign(vec4(sliceColor, 1))
    })
    
    // Output
    return finalOutput
})()

// Shadow
slicedMaterial.shadowNode = tslFn(() =>
{
    // Discard
    inAngle().discard()

    return vec4(0, 0, 0, 1)
})()

// Debug
gui.add(sliceStart, 'value', - Math.PI, Math.PI, 0.001).name('sliceStart')
gui.add(sliceArc, 'value', 0, Math.PI * 2, 0.001).name('sliceArc')
gui.addColor({ color: sliceColor.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { sliceColor.value.set(value) })

/**
 * Objects
 */
let model = null
gltfLoader.load('./gears.glb', (gltf) =>
{
    model = gltf.scene

    model.traverse((child) =>
    {
        if(child.isMesh)
        {
            if(child.name === 'outerHull')
                child.material = slicedMaterial
            else
                child.material = defaultMaterial

            child.castShadow = true
            child.receiveShadow = true
        }
    })

    scene.add(model)
})

/**
 * Plane
 */
const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10, 10),
    new THREE.MeshStandardMaterial({ color: '#aaaaaa' })
)
plane.receiveShadow = true
plane.position.x = - 4
plane.position.y = - 3
plane.position.z = - 4
plane.lookAt(new THREE.Vector3(0, 0, 0))
scene.add(plane)

/**
 * Environment map
 */
rgbeLoader.load('./aerodynamics_workshop.hdr', (environmentMap) =>
{
    environmentMap.mapping = THREE.EquirectangularReflectionMapping

    scene.background = environmentMap
    scene.backgroundBlurriness = 0.5
    scene.environment = environmentMap
})

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 4)
directionalLight.position.set(6.25, 3, 4)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.near = 0.1
directionalLight.shadow.camera.far = 30
directionalLight.shadow.normalBias = 0.05
directionalLight.shadow.camera.top = 8
directionalLight.shadow.camera.right = 8
directionalLight.shadow.camera.bottom = -8
directionalLight.shadow.camera.left = -8
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
camera.position.set(-5, 5, 12)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
    canvas: canvas
})
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
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
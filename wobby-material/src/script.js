import * as THREE from 'three/webgpu'
import GUI from 'lil-gui'
import { mx_noise_float, MeshPhysicalNodeMaterial, color, cross, getRoughness, materialMetalness, materialRoughness, mix, modelNormalMatrix, normalLocal, normalWorld, positionLocal, roughness, sin, smoothstep, tangentLocal, timerGlobal, tslFn, uniform, varyingProperty, vec3, vec4 } from 'three/webgpu'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { simplexNoise4d } from './tsl/simplexNoise4d.js'

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
const material = new MeshPhysicalNodeMaterial({
    metalness: 1,
    roughness: 0.7,
    transmission: 0,
    ior: 1.5,
    thickness: 1.5,
    transparent: true,
    wireframe: false
})

// Uniforms
const warpPositionFrequency = uniform(0.3)
const warpTimeFrequency = uniform(0.12)
const warpStrength = uniform(1.7)
const positionFrequency = uniform(0.5)
const timeFrequency = uniform(0.4)
const strength = uniform(0.3)
const normalComputeShift = uniform(0.01)
const colorA = uniform(color('#0000ff'))
const colorB = uniform(color('#ff0000'))

// Varyings
const vNormal = varyingProperty('vec3')
const vWobble = varyingProperty('vec3')

// Get wobble based using warped simplex noise
const getWobble = tslFn(([position]) =>
{
    const time = timerGlobal()

    // Warped position
    const warpedNoise = simplexNoise4d(vec4(
        position.mul(warpPositionFrequency),
        time.mul(warpTimeFrequency)
    ))
    const warpedPosition = position.add(warpedNoise.mul(warpStrength))

    // Wobble from warped position
    return simplexNoise4d(vec4(
        warpedPosition.mul(positionFrequency),
        time.mul(timeFrequency)
    )).mul(strength)
})

// Position
material.positionNode = tslFn(() =>
{
    const biTangent = cross(normalLocal, tangentLocal.xyz)
    
    // Wobble
    const wobble = getWobble(positionLocal)
    const position = positionLocal.add(normalLocal.mul(wobble))

    // Neighbours
    const neighbourA = positionLocal.add(tangentLocal.xyz.mul(normalComputeShift))
    const neighbourB = positionLocal.add(biTangent.mul(normalComputeShift))
    neighbourA.addAssign(normalLocal.mul(getWobble(neighbourA)))
    neighbourB.addAssign(normalLocal.mul(getWobble(neighbourB)))

    // Normal
    const toA = neighbourA.sub(position).normalize()
    const toB = neighbourB.sub(position).normalize()
    const normal = cross(toA, toB)

    // Varyings
    vWobble.assign(wobble.div(strength))
    vNormal.assign(normal)

    return position
})()

// Normal
material.normalNode = modelNormalMatrix.mul(vNormal)

// Color
const colorMix = smoothstep(-1, 1, vWobble)
material.colorNode = vec4(mix(colorA, colorB, colorMix), 1)

// Roughness
material.roughnessNode = colorMix.oneMinus().mul(materialRoughness)

// Metalness
material.metalnessNode = colorMix.mul(materialMetalness)

// Debug
const basePropertiesFolder = gui.addFolder('base properties')
basePropertiesFolder.add(material, 'metalness', 0, 1, 0.001)
basePropertiesFolder.add(material, 'roughness', 0, 1, 0.001)
basePropertiesFolder.add(material, 'transmission', 0, 1, 0.001)
basePropertiesFolder.add(material, 'ior', 0, 10, 0.001)
basePropertiesFolder.add(material, 'thickness', 0, 10, 0.001)

const customPropertiesFolder = gui.addFolder('custom properties')
customPropertiesFolder.add(warpPositionFrequency, 'value', 0, 1, 0.001).name('warpPositionFrequency')
customPropertiesFolder.add(warpTimeFrequency, 'value', 0, 1, 0.001).name('warpTimeFrequency')
customPropertiesFolder.add(warpStrength, 'value', 0, 5, 0.001).name('warpStrength')
customPropertiesFolder.add(positionFrequency, 'value', 0, 1, 0.001).name('positionFrequency')
customPropertiesFolder.add(timeFrequency, 'value', 0, 1, 0.001).name('timeFrequency')
customPropertiesFolder.add(strength, 'value', 0, 1, 0.001).name('strength')
customPropertiesFolder.add(normalComputeShift, 'value', 0.0001, 0.1, 0.0001).name('normalComputeShift')
customPropertiesFolder.addColor({ color: colorA.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorA.value.set(value) })
customPropertiesFolder.addColor({ color: colorB.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorB.value.set(value) })

/**
 * Objects
 */
// Sphere
let geometry = new THREE.IcosahedronGeometry(2.5, 70)
geometry = mergeVertices(geometry)
geometry.computeTangents()

const wobble = new THREE.Mesh(geometry, material)
wobble.receiveShadow = true
wobble.castShadow = true
scene.add(wobble)

// // Model
// gltfLoader.load('./suzanne.glb', (gltf) =>
// {
//     const wobble = gltf.scene.children[0]
//     wobble.receiveShadow = true
//     wobble.castShadow = true
//     wobble.material = material

//     scene.add(wobble)
// })

/**
 * Plane
 */
const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 15, 15),
    new THREE.MeshStandardMaterial()
)
plane.receiveShadow = true
plane.rotation.y = Math.PI
plane.position.y = - 5
plane.position.z = 5
scene.add(plane)

/**
 * Environment map
 */
rgbeLoader.load('./urban_alley_01_1k.hdr', (environmentMap) =>
{
    environmentMap.mapping = THREE.EquirectangularReflectionMapping

    scene.background = environmentMap
    scene.environment = environmentMap
})

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 20
directionalLight.shadow.normalBias = 0.05
directionalLight.position.set(0.5, 4, - 4.5)
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
camera.position.set(13, - 3, - 5)
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
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.shadowMap.type = THREE.PCFSoftShadowMap
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
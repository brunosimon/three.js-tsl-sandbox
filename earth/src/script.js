import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import { step, normalWorld, output, texture, vec3, vec4, normalize, positionWorld, cameraPosition, color, uniform, mix, uv, max } from 'three/webgpu'

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
 * Lights
 */
// Sun
const sun = new THREE.DirectionalLight('#ffffff', 2)
sun.position.set(0, 0, 3)
scene.add(sun)

/**
 * Earth uniforms
 */
const atmosphereDayColor = uniform(color('#4db2ff'))
const atmosphereTwilightColor = uniform(color('#bc490b'))
const roughnessLow = uniform(0.25)
const roughnessHigh = uniform(0.35)

gui
    .addColor({ color: atmosphereDayColor.value.getHex(THREE.SRGBColorSpace) }, 'color')
    .onChange((value) => { atmosphereDayColor.value.set(value) })
    .name('atmosphereDayColor')

gui
    .addColor({ color: atmosphereTwilightColor.value.getHex(THREE.SRGBColorSpace) }, 'color')
    .onChange((value) => { atmosphereTwilightColor.value.set(value) })
    .name('atmosphereTwilightColor')

gui.add(roughnessLow, 'value', 0, 1, 0.001).name('roughnessLow')
gui.add(roughnessHigh, 'value', 0, 1, 0.001).name('roughnessHigh')

/**
 * Earth global stuff
 */
// Textures
const dayTexture = textureLoader.load('./earth/day.jpg')
dayTexture.colorSpace = THREE.SRGBColorSpace
dayTexture.anisotropy = 8

const nightTexture = textureLoader.load('./earth/night.jpg')
nightTexture.colorSpace = THREE.SRGBColorSpace
nightTexture.anisotropy = 8

const bumpRoughnessCloudsTexture = textureLoader.load('./earth/bumpRoughnessClouds.png')
bumpRoughnessCloudsTexture.anisotropy = 8

// Fresnel
const viewDirection = positionWorld.sub(cameraPosition).normalize()
const fresnel = viewDirection.dot(normalWorld).abs().oneMinus().toVar()

// Sun orientation
const sunOrientation = normalWorld.dot(normalize(sun.position)).toVar()

// Amtmosphere
const atmosphereColor = mix(atmosphereTwilightColor, atmosphereDayColor, sunOrientation.smoothstep(-0.25, 0.75)).toVar()

/**
 * Earth globe
 */
// Material
const globeMaterial = new THREE.MeshStandardNodeMaterial()

// Clouds
const cloudsStrength = texture(bumpRoughnessCloudsTexture, uv()).b.smoothstep(0.2, 1)

// Color
globeMaterial.colorNode = mix(texture(dayTexture), vec3(1), cloudsStrength.mul(2))

// Roughness
const roughness = max(
    texture(bumpRoughnessCloudsTexture).g,
    step(0.01, cloudsStrength)
)
globeMaterial.roughnessNode = roughness.remap(0, 1, roughnessLow, roughnessHigh)

// Ouput
const night = texture(nightTexture)
const dayStrength = sunOrientation.smoothstep(-0.25, 0.5)
let finalOutput = mix(night.rgb, output.rgb, dayStrength)

const atmosphereDayStrength = sunOrientation.smoothstep(-0.5, 1)
const atmosphereMix = atmosphereDayStrength.mul(fresnel.pow(2)).clamp(0, 1)
finalOutput = mix(finalOutput, atmosphereColor, atmosphereMix)

globeMaterial.outputNode = vec4(finalOutput, output.a)

// Normal
const bumpElevation = max(
    texture(bumpRoughnessCloudsTexture).r,
    cloudsStrength
).mul(1)
globeMaterial.normalNode = bumpElevation.bumpMap()

// Mesh
const sphereGeometry = new THREE.SphereGeometry(1, 64, 64)
const globe = new THREE.Mesh(sphereGeometry, globeMaterial)
scene.add(globe)

/**
 * Earth atmopshere
 */
// Material
const atmosphereMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true })
let alpha = fresnel.remap(0.73, 1, 1, 0).pow(3)
alpha = alpha.mul(sunOrientation.smoothstep(-0.5, 1))
atmosphereMaterial.outputNode = vec4(atmosphereColor, alpha)

// Mesh
const atmosphere = new THREE.Mesh(sphereGeometry, atmosphereMaterial)
atmosphere.scale.setScalar(1.04, 1.04, 1.04)
scene.add(atmosphere)

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
camera.position.x = 4
camera.position.y = 2
camera.position.z = 3
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

    // Update globe
    globe.rotation.y = elapsedTime * 0.02 + 4.2

    // Update controls
    controls.update()

    // Render
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
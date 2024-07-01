import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import { MeshStandardNodeMaterial, normalWorld, output, texture, vec3, vec4, normalize, positionWorld, cameraPosition, color, uniform, mix, lights, lightingContext, MeshBasicNodeMaterial, uv, vec2, timerLocal, positionLocal, max, normalView  } from 'three/examples/jsm/nodes/Nodes.js'
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
const textureLoader = new THREE.TextureLoader()

/**
 * Lights
 */
// Sun
const sun = new THREE.DirectionalLight('#ffffff', 2)
sun.position.set(0, 0, 3)
scene.add(sun)

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

// Time
const time = timerLocal()

// Fresnel
const viewDirection = positionWorld.sub(cameraPosition).normalize()
const fresnel = viewDirection.dot(normalWorld).abs().oneMinus()

// Sun orientation
const sunOrientation = normalWorld.dot(normalize(sun.position))

// Amtmosphere
const atmosphereDayColor = uniform(color('#4db2ff'))
const atmosphereTwilightColor = uniform(color('#ff5900'))
const atmosphereColor = mix(atmosphereTwilightColor, atmosphereDayColor, sunOrientation.smoothstep(-0.25, 0.75))

gui
    .addColor({ color: atmosphereDayColor.value.getHex(THREE.SRGBColorSpace) }, 'color')
    .onChange((value) => { atmosphereDayColor.value.set(value) })
    .name('atmosphereDayColor')

gui
    .addColor({ color: atmosphereTwilightColor.value.getHex(THREE.SRGBColorSpace) }, 'color')
    .onChange((value) => { atmosphereTwilightColor.value.set(value) })
    .name('atmosphereTwilightColor')

/**
 * Earth globe
 */
// Material
const globeMaterial = new MeshStandardNodeMaterial()

const roughnessLow = uniform(0.25)
const roughnessHigh = uniform(0.35)

gui.add(roughnessLow, 'value', 0, 1, 0.001).name('roughnessLow')
gui.add(roughnessHigh, 'value', 0, 1, 0.001).name('roughnessHigh')

// Color
let finalColor = texture(dayTexture)
const noiseB = vec2(
    simplexNoise4d(vec4(positionLocal.xyz.mul(1.35).add(456.123), time.mul(0.02))),
    simplexNoise4d(vec4(positionLocal.xyz.mul(1.35).add(123.456), time.mul(0.02)))
).mul(0.2)
const noiseA = vec2(
    simplexNoise4d(vec4(positionLocal.xyz.mul(0.5), time.mul(0.01))),
    simplexNoise4d(vec4(positionLocal.xyz.mul(0.5).add(123.456), time.mul(0.01)))
).mul(0.2)
const noiseFinal = noiseA.mul(noiseB)


const cloudsShadowUv = uv().add(noiseFinal).mod(1).add(0.002)
const cloudsShadowMix = texture(bumpRoughnessCloudsTexture, cloudsShadowUv).b.smoothstep(0.2, 1)
finalColor = mix(finalColor, vec3(-0.1), cloudsShadowMix)

const cloudsUv = uv().add(noiseFinal).mod(1)
const cloudsMix = texture(bumpRoughnessCloudsTexture, cloudsUv).b.smoothstep(0.2, 1)
finalColor = mix(finalColor, vec3(2), cloudsMix)
globeMaterial.colorNode = finalColor

// Roughness
const roughness = max(
    texture(bumpRoughnessCloudsTexture).g,
    cloudsMix
)
globeMaterial.roughnessNode = roughness.remap(0, 1, roughnessLow, roughnessHigh)

// Ouput
const nightNode = texture(nightTexture)
const dayMix = sunOrientation.smoothstep(-0.25, 0.5)
let finalOutput = output.rgb.mix(nightNode.rgb, dayMix)

const atmosphereDayMix = sunOrientation.smoothstep(-0.5, 1)
const atmosphereMix = atmosphereDayMix.mul(fresnel.pow(2)).clamp(0, 1)
finalOutput = mix(finalOutput, atmosphereColor, atmosphereMix)

globeMaterial.outputNode = vec4(finalOutput, output.a)

// Normal
const bumpElevation = max(
    texture(bumpRoughnessCloudsTexture).r,
    cloudsMix.add(0.2)
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
const atmosphereMaterial = new MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true })
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
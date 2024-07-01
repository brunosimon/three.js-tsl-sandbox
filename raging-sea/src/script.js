import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import { MeshStandardNodeMaterial, add, color, mix, modelWorldMatrix, positionLocal, positionWorld, sin, uv, vec2, vec3, vec4, timerGlobal, mul, abs, sub, varying, timerLocal, smoothstep, oscSine, uniform, float, tslFn, modelNormalMatrix, output } from 'three/examples/jsm/nodes/Nodes.js'
import { simplexNoise3d } from './tsl/simplexNoise3d'
import { loop } from 'three/examples/jsm/nodes/Nodes.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Mesh
 */
const material = new MeshStandardNodeMaterial({ roughness: 0.15 })

gui.add(material, 'roughness', 0, 1, 0.001)

const colorDepth = uniform(color('#ff0a81'))
const colorSurface = uniform(color('#271442'))
const colorBottom = uniform(-0.35)
const colorTop = uniform(0.2)
const colorPower = uniform(4)
const bigWavesFrequency = uniform(vec2(3, 1))
const bigWavesSpeed = uniform(0.75)
const bigWavesMultiplier = uniform(0.15)
const smallWavesIterations = uniform(4)
const smallWavesFrequency = uniform(2)
const smallWavesSpeed = uniform(0.2)
const smallWavesMultiplier = uniform(0.08)
const normalComputeShift = uniform(0.01)

const colorFolder = gui.addFolder('🎨 color')
colorFolder.addColor({ color: colorDepth.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => { colorDepth.value.set(value) })
   .name('depth')
colorFolder.addColor({ color: colorSurface.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => { colorSurface.value.set(value) })
   .name('surface')
colorFolder.add(colorBottom, 'value', -1, 0, 0.001).name('bottom')
colorFolder.add(colorTop, 'value', 0, 1, 0.001).name('top')
colorFolder.add(colorPower, 'value', 1, 10, 1).name('power')

const wavesFolder = gui.addFolder('🌊 waves')
wavesFolder.add(bigWavesSpeed, 'value', 0, 1).name('bigSpeed')
wavesFolder.add(bigWavesSpeed, 'value', 0, 1).name('bigSpeed')
wavesFolder.add(bigWavesMultiplier, 'value', 0, 1).name('bigMultiplier')
wavesFolder.add(bigWavesFrequency.value, 'x', 0, 10).name('bigFrequencyX')
wavesFolder.add(bigWavesFrequency.value, 'y', 0, 10).name('bigFrequencyY')
wavesFolder.add(smallWavesIterations, 'value', 0, 10, 1).name('smallIterations')
wavesFolder.add(smallWavesFrequency, 'value', 0, 10).name('smallFrequency')
wavesFolder.add(smallWavesSpeed, 'value', 0, 1).name('smallSpeed')
wavesFolder.add(smallWavesMultiplier, 'value', 0, 1).name('smallMultiplier')
wavesFolder.add(normalComputeShift, 'value', 0, 0.1, 0.0001).name('computeShift')

// Waves elevation
const getWavesElevation = tslFn(([position]) =>
{
    const time = timerLocal()

    const elevation = mul(
        sin(position.x.mul(bigWavesFrequency.x).add(time.mul(bigWavesSpeed))),
        sin(position.z.mul(bigWavesFrequency.y).add(time.mul(bigWavesSpeed)))
    )

    elevation.mulAssign(bigWavesMultiplier)

    loop({ start: 1, end: smallWavesIterations }, ({ i }) =>
    {
        const noiseInput = vec3(
            position.xz.mul(smallWavesFrequency).mul(i),
            time.mul(smallWavesSpeed)
        )
        const wave = simplexNoise3d(noiseInput).mul(smallWavesMultiplier).div(i).abs()
        elevation.subAssign(wave)
    })

    return elevation
})

// Position
const elevation = getWavesElevation(positionLocal)
const position = positionLocal.add(vec3(0, elevation, 0))

material.positionNode = position

// Normal
let positionA = positionLocal.add(vec3(normalComputeShift, 0, 0))
let positionB = positionLocal.add(vec3(0, 0, normalComputeShift.negate()))

positionA = positionA.add(vec3(0, getWavesElevation(positionA), 0))
positionB = positionB.add(vec3(0, getWavesElevation(positionB), 0))

const toA = positionA.sub(position).normalize()
const toB = positionB.sub(position).normalize()
const normal = toA.cross(toB)

material.normalNode = modelNormalMatrix.mul(normal)

// Color
material.colorNode = vec4(colorSurface, 1)

const emissiveMix = elevation.remap(colorTop, colorBottom).pow(colorPower)
const finalOutput = mix(output.rgb, colorDepth, emissiveMix)
material.outputNode = vec4(finalOutput, 1)

// Mesh
const geometry = new THREE.PlaneGeometry(2, 2, 512, 512)
geometry.rotateX(- Math.PI * 0.5)
const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

/**
 * Lights
 */
// // Ambient light
// const ambientLight = new THREE.AmbientLight('#0000ff', 0.5)
// scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
directionalLight.position.set(-4, 2, 0)
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
camera.position.x = 4 * 0.5
camera.position.y = 3 * 0.5
camera.position.z = 3 * 0.5
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, -0.25, 0)
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
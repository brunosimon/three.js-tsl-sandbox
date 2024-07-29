import * as THREE from 'three/webgpu'
import { float, mx_noise_float, loop, color, positionLocal, sin, vec2, vec3, vec4, mul, timerLocal, uniform, tslFn, modelNormalMatrix } from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
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

/**
 * Mesh
 */
const material = new THREE.MeshStandardNodeMaterial({ roughness: 0.15 })

gui.add(material, 'roughness', 0, 1, 0.001)

const colorDepth = uniform(color('#ff0a81'))
const colorSurface = uniform(color('#271442'))
const mixLow = uniform(-0.35)
const mixHigh = uniform(0.2)
const mixPower = uniform(5)
const largeWavesFrequency = uniform(vec2(3, 1))
const largeWavesSpeed = uniform(1.25)
const largeWavesMultiplier = uniform(0.15)
const smallWavesIterations = uniform(4)
const smallWavesFrequency = uniform(2)
const smallWavesSpeed = uniform(0.2)
const smallWavesMultiplier = uniform(0.18)
const normalComputeShift = uniform(0.01)

const colorFolder = gui.addFolder('🎨 color')
colorFolder.addColor({ color: colorDepth.value.getHex(THREE.SRGBColorSpace) }, 'color').name('depth').onChange(value => colorDepth.value.set(value) )
colorFolder.addColor({ color: colorSurface.value.getHex(THREE.SRGBColorSpace) }, 'color').name('surface').onChange(value => colorSurface.value.set(value) )
colorFolder.add(mixLow, 'value', -1, 0, 0.001).name('mixLow')
colorFolder.add(mixHigh, 'value', 0, 1, 0.001).name('mixHigh')
colorFolder.add(mixPower, 'value', 1, 10, 1).name('mixPower')

const wavesFolder = gui.addFolder('🌊 waves')
wavesFolder.add(largeWavesSpeed, 'value', 0, 5).name('largeSpeed')
wavesFolder.add(largeWavesMultiplier, 'value', 0, 1).name('largeMultiplier')
wavesFolder.add(largeWavesFrequency.value, 'x', 0, 10).name('largeFrequencyX')
wavesFolder.add(largeWavesFrequency.value, 'y', 0, 10).name('largeFrequencyY')
wavesFolder.add(smallWavesIterations, 'value', 0, 10, 1).name('smallIterations')
wavesFolder.add(smallWavesFrequency, 'value', 0, 10).name('smallFrequency')
wavesFolder.add(smallWavesSpeed, 'value', 0, 1).name('smallSpeed')
wavesFolder.add(smallWavesMultiplier, 'value', 0, 1).name('smallMultiplier')
wavesFolder.add(normalComputeShift, 'value', 0, 0.1, 0.0001).name('normalComputeShift')

// Waves elevation
const wavesElevation = tslFn(([position]) =>
{
    const time = timerLocal()

    const elevation = mul(
        sin(position.x.mul(largeWavesFrequency.x).add(time.mul(largeWavesSpeed))),
        sin(position.z.mul(largeWavesFrequency.y).add(time.mul(largeWavesSpeed)))
    )

    elevation.mulAssign(largeWavesMultiplier)

    loop({ start: float(1), end: smallWavesIterations }, ({ i }) =>
    {
        const noiseInput = vec3(
            position.xz
                .add(1)
                .mul(smallWavesFrequency)
                .mul(i),
            time.mul(smallWavesSpeed)
        )
        const wave = mx_noise_float(noiseInput, 1, 0).mul(smallWavesMultiplier).div(i).abs()
        elevation.subAssign(wave)
    })

    return elevation
})

// Position
const elevation = wavesElevation(positionLocal)
const position = positionLocal.add(vec3(0, elevation, 0))

material.positionNode = position

// Normal
let positionA = positionLocal.add(vec3(normalComputeShift, 0, 0))
let positionB = positionLocal.add(vec3(0, 0, normalComputeShift.negate()))

positionA = positionA.add(vec3(0, wavesElevation(positionA), 0))
positionB = positionB.add(vec3(0, wavesElevation(positionB), 0))

const toA = positionA.sub(position).normalize()
const toB = positionB.sub(position).normalize()
const normal = toA.cross(toB)

material.normalNode = modelNormalMatrix.mul(normal)

// Color
material.colorNode = vec4(colorSurface, 1)

const emissive = elevation.remap(mixHigh, mixLow).pow(mixPower)
material.emissiveNode = colorDepth.mul(emissive)

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

    // Update controls
    controls.update()

    // Render
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
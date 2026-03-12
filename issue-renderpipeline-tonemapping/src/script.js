import GUI from 'lil-gui'
import * as THREE from 'three/webgpu'
import { pass } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * Base
 */
// Debug
const gui = new GUI({
    width: 400
})

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

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
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 6
camera.position.y = 3
camera.position.z = 10
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
 const params = {
     toneMapping: 'Cineon',
 }
 
 const toneMappingOptions = {
    None: THREE.NoToneMapping,
    Linear: THREE.LinearToneMapping,
    Reinhard: THREE.ReinhardToneMapping,
    Cineon: THREE.CineonToneMapping,
    ACESFilmic: THREE.ACESFilmicToneMapping,
    AgX: THREE.AgXToneMapping,
    Neutral: THREE.NeutralToneMapping
}
const renderer = new THREE.WebGPURenderer({
    canvas: canvas,
    forceWebGL: false
})
renderer.toneMapping = toneMappingOptions[params.toneMapping]
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000000)

gui.add( params, 'toneMapping', Object.keys( toneMappingOptions ) )
    .name( 'type' )
    .onChange( function () {

        renderer.toneMapping = toneMappingOptions[ params.toneMapping ];

    } );
gui.add(renderer, 'toneMappingExposure', 1, 10, 0.01)

/**
 * Post processing
 */
const renderPipeline = new THREE.RenderPipeline(renderer)

const scenePass = pass(scene, camera)

renderPipeline.outputNode = scenePass

/**
 * Floor
 */
{
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardNodeMaterial({ color: 'red' }))
    floor.rotation.x = - Math.PI * 0.5
    scene.add(floor)
}

/**
 * Lights
 */
{
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
    directionalLight.position.set(2, 4, 0)
    scene.add(directionalLight)
}

/**
 * Animate
 */
const timer = new THREE.Timer()
const tick = () =>
{
    timer.update()

    // Update controls
    controls.update()

    // // Mesh
    // mesh.position.y = (Math.sin(timer.getElapsed()) + 1)

    // Render
    // renderer.render(scene, camera)
    renderPipeline.render()
}
renderer.setAnimationLoop(tick)
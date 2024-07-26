import GUI from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { modelViewMatrix, cameraProjectionMatrix, WebGPURenderer, MeshBasicNodeMaterial, skinning, add, color, hash, mix, modelWorldMatrix, normalView, positionLocal, positionWorld, sin, timerGlobal, tslFn, uniform, vec3, vec4, cameraViewMatrix, varying } from 'three/tsl'

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
const gltfLoader = new GLTFLoader()

/**
 * Material
 */
const material = new MeshBasicNodeMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
})

// Position
const glitchStrength = varying(0)

material.vertexNode = tslFn(() =>
{
    const glitchTime = timerGlobal().sub(positionWorld.y.mul(0.5))
    
    glitchStrength.assign(add(
        sin(glitchTime),
        sin(glitchTime.mul(3.45)),
        sin(glitchTime.mul(8.76))
    ).div(3).smoothstep(0.3, 1))

    const glitch = vec3(
        hash(positionWorld.xz.abs().mul(9999)).sub(0.5),
        0,
        hash(positionWorld.yx.abs().mul(9999)).sub(0.5),
    )

    positionWorld.xyz.addAssign(glitch.mul(glitchStrength.mul(0.5)))

    return cameraProjectionMatrix.mul(cameraViewMatrix).mul(positionWorld);
})()

// Color
const colorInside = uniform(color('#ff6088'))
const colorOutside = uniform(color('#4d55ff'))

material.colorNode = tslFn(() =>
{
    const stripes = positionWorld.y.sub(timerGlobal(0.02)).mul(20).mod(1).pow(3)

    const fresnel = normalView.dot(vec3(0, 0, 1)).abs().oneMinus()
    const falloff = fresnel.smoothstep(0.8, 0.2)
    const alpha = stripes.mul(fresnel).add(fresnel.mul(1.25)).mul(falloff)
    const finalColor = mix(colorInside, colorOutside, fresnel.add(glitchStrength.mul(0.6)))

    return vec4(finalColor, alpha)
})()

// Debug
gui.addColor({ color: colorInside.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => colorInside.value.set(value))
gui.addColor({ color: colorOutside.value.getHex(THREE.SRGBColorSpace) }, 'color')
   .onChange((value) => colorOutside.value.set(value))

/**
 * Objects
 */
// Torus knot
const torusKnot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32),
    material
)
torusKnot.position.x = 3
scene.add(torusKnot)

// Sphere
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    material
)
sphere.position.x = - 3
scene.add(sphere)

// Model
let model
let mixer
gltfLoader.load(
    './Soldier.glb',
    (gltf) =>
    {
        model = gltf.scene
        model.scale.setScalar( 1.75 );
        model.rotation.y = Math.PI;
        model.position.y = - 1.5;

        mixer = new THREE.AnimationMixer(model)
        const action = mixer.clipAction(gltf.animations[0])
        action.play()

        model.traverse((child) =>
        {
            if(child.isMesh)
            {
                const skinningMaterial = material.clone()
                skinningMaterial.positionNode = skinning(child)
                child.material = skinningMaterial

                // child.material = material
            }
        })
        scene.add(model)
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
const renderer = new WebGPURenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

debugObject.clearColor = '#231726'
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
    const deltaTime = clock.getDelta()

    if ( typeof mixer !== 'undefined' )
    {
        mixer.update( deltaTime );
    }

    // Update controls
    controls.update()

    // Render
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
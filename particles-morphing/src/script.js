import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { MeshStandardNodeMaterial, SpriteNodeMaterial, color, cos, float, instanceIndex, mix, positionLocal, smoothstep, storage, tslFn, uniform, uv, varying, vec3, vec4 } from 'three/examples/jsm/nodes/Nodes.js'
import StorageInstancedBufferAttribute from 'three/examples/jsm/renderers/common/StorageInstancedBufferAttribute.js'
import gsap from 'gsap'
import { simplexNoise3d } from './tsl/simplexNoise3d.js'

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
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('./draco/')
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Particles
 */
let particles = null

gltfLoader.load('./models.glb', (gltf) =>
{
    particles = {}
    particles.index = 0

    // Positions
    const positions = gltf.scene.children.map(child => child.geometry.attributes.position)

    particles.maxCount = 0
    for(const position of positions)
        if(position.count > particles.maxCount)
            particles.maxCount = position.count

    particles.positions = []
    for(const position of positions)
    {
        const originalArray = position.array
        const newArray = new Float32Array(particles.maxCount * 3)

        for(let i = 0; i < particles.maxCount; i++)
        {
            const i3 = i * 3

            if(i3 < originalArray.length)
            {
                newArray[i3 + 0] = originalArray[i3 + 0]
                newArray[i3 + 1] = originalArray[i3 + 1]
                newArray[i3 + 2] = originalArray[i3 + 2]
            }
            else
            {
                const randomIndex = Math.floor(position.count * Math.random()) * 3
                newArray[i3 + 0] = originalArray[randomIndex + 0]
                newArray[i3 + 1] = originalArray[randomIndex + 1]
                newArray[i3 + 2] = originalArray[randomIndex + 2]
            }
        }

        particles.positions.push(storage(new StorageInstancedBufferAttribute(newArray, 3), 'vec3', particles.maxCount).toAttribute())
    }

    // Scale
    const scalesArray = new Float32Array(particles.maxCount)
    for(let i = 0; i < particles.maxCount; i++)
        scalesArray[i] = Math.random()
    const scalesAttribute = storage(new StorageInstancedBufferAttribute(scalesArray, 1), 'float', particles.maxCount).toAttribute()
    
    /**
    * Material
    */
    const material = new SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })

    const colorOriginUniform = uniform(color('#6181ff'))
    const colorTargetUniform = uniform(color('#ff8861'))
    const progressUniform = uniform(0)
    const noiseScaleUniform = uniform(0.2)
    const transitionRatioUniform = uniform(0.4)
    const scaleUniform = uniform(0.4)

    // Mixed position
    const getMixedPosition = tslFn(([origin, target]) =>
    {
        // Noises
        const noiseOrigin = simplexNoise3d(vec3(origin.mul(noiseScaleUniform)))
        const noiseTarget = simplexNoise3d(vec3(target.mul(noiseScaleUniform)))
        const noise = mix(noiseOrigin, noiseTarget, progressUniform).smoothstep(-1, 1)

        // Transition
        const duration = transitionRatioUniform
        const delay = duration.oneMinus().mul(noise)
        const end = delay.add(duration)
        const progress = smoothstep(delay, end, progressUniform)

        // Color varying
        const colorVarying = varying(vec3(), 'colorVarying').assign(mix(colorOriginUniform, colorTargetUniform, noise))

        // Output
        return mix(origin, target, progress)
    })
    material.positionNode = getMixedPosition(particles.positions[0], particles.positions[1])

    // Scale
    material.scaleNode = scalesAttribute.mul(scaleUniform)

    // Color
    material.colorNode = tslFn(() =>
    {
        const colorVarying = varying(vec3(), 'colorVarying')
        const intensity = float(0.05).div(uv().sub(0.5).length()).sub(0.1)
        return vec4(colorVarying.mul(intensity.pow(2)), 1)
    })()

    /**
    * Mesh
    */
    const geometry = new THREE.PlaneGeometry(1, 1)
    const mesh = new THREE.InstancedMesh(geometry, material, particles.maxCount)
    scene.add(mesh)

    // Methods
    particles.morph = (index) =>
    {
        // Update attributes
        material.positionNode = getMixedPosition(particles.positions[particles.index], particles.positions[index])
        material.needsUpdate = true

        // Animate uProgress
        gsap.fromTo(
            progressUniform,
            { value: 0 },
            { value: 1, duration: 3, ease: 'linear' }
        )

        // Save index
        particles.index = index
    }
    
    particles.morph0 = () => { particles.morph(0) }
    particles.morph1 = () => { particles.morph(1) }
    particles.morph2 = () => { particles.morph(2) }
    particles.morph3 = () => { particles.morph(3) }

    /**
    * Debug
    */
    gui.addColor({ color: colorOriginUniform.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorOriginUniform.value.set(value) }).name('colorOrigin')
    gui.addColor({ color: colorTargetUniform.value.getHexString(THREE.SRGBColorSpace) }, 'color').onChange((value) => { colorTargetUniform.value.set(value) }).name('colorTarget')
    gui.add(progressUniform, 'value', 0, 1, 0.01).name('progress')
    gui.add(noiseScaleUniform, 'value', 0, 1, 0.01).name('noiseScale')
    gui.add(transitionRatioUniform, 'value', 0, 1, 0.01).name('transitionRatio')
    gui.add(scaleUniform, 'value', 0, 1, 0.01).name('scaleUniform')

    gui.add(particles, 'morph0')
    gui.add(particles, 'morph1')
    gui.add(particles, 'morph2')
    gui.add(particles, 'morph3')
})

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
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 2, 15)
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
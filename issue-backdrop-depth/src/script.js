import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js'
import { MeshBasicNodeMaterial, float, viewportLinearDepth, linearDepth, sqrt, vec2, vec3, vec4, viewportResolution, viewportSharedTexture, viewportTopLeft, tslFn, SpriteNodeMaterial, range, instanceIndex, mat4, modelWorldMatrix, cameraNear, cameraFar, positionGeometry, cameraProjectionMatrix, cameraViewMatrix } from 'three/examples/jsm/nodes/Nodes.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { Timer } from 'three/examples/jsm/Addons.js'

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
 * Tests
 */
const testDepth = tslFn(() =>
{
    // const relativeDepth = viewportLinearDepth.distance(linearDepth())
    return linearDepth()
})

// Simple
const simpleMaterial = new MeshBasicNodeMaterial({ transparent: true })

simpleMaterial.backdropNode = vec4(vec3(testDepth()), 1)

const simple = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), simpleMaterial)
simple.position.y = 0
simple.position.x = -1.2
simple.position.z = 0
scene.add(simple)

// Sprite
const spriteMaterial = new SpriteNodeMaterial({ transparent: true })

spriteMaterial.backdropNode = vec4(vec3(testDepth()), 1)

const sprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), spriteMaterial)
sprite.position.y = 0
sprite.position.x = 1.2
sprite.position.z = 0
scene.add(sprite)

// Instanced Sprite
const instancedSpriteMaterial = new SpriteNodeMaterial({ transparent: true })

instancedSpriteMaterial.scaleNode = 0.5


const pos = vec3( 0, 0, float( instanceIndex ).div( 5 ).sub( 0.5 ).mul( 2 ) );

const matrixWorld = mat4(
    modelWorldMatrix[ 0 ],
    modelWorldMatrix[ 1 ],
    modelWorldMatrix[ 2 ],
    vec4( modelWorldMatrix[ 3 ].xyz.add( pos ), 1.0)
);

const modelViewMatrix = cameraViewMatrix.mul( matrixWorld );
const mvp = cameraProjectionMatrix.mul( modelViewMatrix ).mul( positionGeometry )
const linearDepth2 = mvp.w.varying().sub( cameraNear ).div( cameraFar );


instancedSpriteMaterial.backdropNode = vec4( vec3( linearDepth2 ), 1)
instancedSpriteMaterial.vertexNode = mvp;

// instancedSpriteMaterial.backdropNode = vec4(vec3(testDepth()), 1)
instancedSpriteMaterial.positionNode = tslFn(() =>
{
    return vec3(
        0,
        0,
        float(instanceIndex).div(5).sub(0.5).mul(2)
    )
})()

const instancedSprite = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), instancedSpriteMaterial, 6)
instancedSprite.position.y = 0
instancedSprite.position.x = 0
instancedSprite.position.z = 0
scene.add(instancedSprite)

/**
 * Portal
 */
const portalMaterial = new MeshBasicNodeMaterial({ side: THREE.DoubleSide, transparent: true })

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

    simple.position.z = Math.sin(elapsedTime * 0.3)
    sprite.position.z = Math.sin(elapsedTime * 0.3)

    // Update controls
    controls.update()

    // Render
    renderer.renderAsync(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
import { Color, NodeMaterial, addNodeMaterial, clamp, smoothstep, If, color, tslFn, uniform, vec3, vec4, positionWorld, normalWorld, mix, vec2, uv, min, rangeFog, viewportLinearDepth, viewportDepthTexture, perspectiveDepthToViewZ } from 'three/webgpu'

const toMask = tslFn(([ normal ]) =>
{
    const vecX = vec3(1, 0, 0).toVar()
    const vecY = vec3(0, 1, 0).toVar()
    const vecZ = vec3(0, 0, 1).toVar()

    const dotX = normal.dot(vecX).abs()
    const dotY = normal.dot(vecY).abs()
    const dotZ = normal.dot(vecZ).abs()

    const mask = vecX

    If(dotZ.greaterThan(dotX), () =>
    {
        mask.assign(vecZ)
    })
    If(dotY.greaterThan(dotX).and(dotY.greaterThan(dotZ)), () =>
    {
        mask.assign(vecY)
    })

    return mask
})

const toTriplanarUv = tslFn(([ position, mask ]) =>
{
    const uvX = position.yz.toVar()
    const uvY = position.xz.toVar()
    const uvZ = position.xy.toVar()

    let uv = uvX

	uv = mix(uv, uvY, mask.y)
	uv = mix(uv, uvZ, mask.z)

    return uv
})

const toGrid = tslFn(([uv, scale, thickness, offset]) =>
{
    const referenceUv = uv.div(scale).add(offset)
    const grid = referenceUv.sub(0.5).fract().sub(0.5).abs().mul(2).step(thickness)
	return mix(grid.x, 1, grid.y)
})

const toAntialiasedGrid = tslFn(([uv, scale, thickness, offset, derivateMask]) =>
{
    // Based on https://bgolus.medium.com/the-best-darn-grid-shader-yet-727f9278b9d8
    const lineWidth = thickness
    const referenceUv = uv.div(scale).add(offset)
    const uvDeriv = referenceUv.fwidth().mul(derivateMask)
    const drawWidth = clamp(lineWidth, uvDeriv, 1);
    const lineAA = uvDeriv.mul(1.5);
    const gridUV = referenceUv.fract().mul(2).sub(1).abs().oneMinus()
    let grid2 = smoothstep(drawWidth.add(lineAA), drawWidth.sub(lineAA), gridUV);
    grid2 = grid2.mul(clamp(lineWidth.div(drawWidth), 0, 1))
    grid2 = mix(grid2, lineWidth, clamp(uvDeriv.mul(2).sub(1), 0, 1))
    return mix(grid2.x, 1, grid2.y)
})

class MeshGridMaterialLine
{
	constructor(_color = 0xffffff, scale = 1, thickness = 0.05, offset = vec2(0))
	{
		this.color = uniform(color(_color))
		this.scale = uniform(scale)
		this.thickness = uniform(thickness)
		this.offset = uniform(offset)
	}
}

class MeshGridMaterial extends NodeMaterial
{
	constructor(parameters)
	{
		super()
		
		this.normals = false;
		this.lights = false;
		this.isMeshGridMaterial = true;
		this.testNode = null;

		this.scaleNode = uniform(1)

		this.reference = 'uv'
		this.antialiased = true
		this.color = new Color(0x000000)
		this.lines = [
			new MeshGridMaterialLine()
		]

		this.setValues(parameters)
    }

	get scale()
	{
		return this.scaleNode.value
	}

	set scale(value)
	{
		this.scaleNode.value = value
	}

	setup( builder ) {

		const mask = toMask(normalWorld)
		const maskDerivate = mask.fwidth().length().oneMinus().clamp(0, 1)

		let uvReference = uv()
		if(this.reference === 'worldTriplanar')
			uvReference = toTriplanarUv(positionWorld, mask)
		else if(this.reference === 'worldX')
			uvReference = positionWorld.yz
		else if(this.reference === 'worldY')
			uvReference = positionWorld.xz
		else if(this.reference === 'worldZ')
			uvReference = positionWorld.xy
		else if(this.reference === 'localTriplanar')
			uvReference = toTriplanarUv(positionLocal, mask)
		else if(this.reference === 'localX')
			uvReference = positionLocal.yz
		else if(this.reference === 'localY')
			uvReference = positionLocal.xz
		else if(this.reference === 'localZ')
			uvReference = positionLocal.xy

		let gridColor = uniform(this.color)

		for(const line of this.lines)
		{
			const grid = this.antialiased ? 
				toAntialiasedGrid(uvReference, line.scale.mul(this.scaleNode), line.thickness, line.offset, maskDerivate) :
				toGrid(uvReference, line.scale.mul(this.scaleNode), line.thickness, line.offset)
			
			gridColor = mix(
				gridColor,
				line.color,
				grid
			)
		}

		this.fragmentNode = vec4(gridColor, 1);

		super.setup( builder );

	}

}

export default MeshGridMaterial
export { MeshGridMaterialLine, toMask, toTriplanarUv, toAntialiasedGrid }

addNodeMaterial('MeshGridMaterial', MeshGridMaterial)

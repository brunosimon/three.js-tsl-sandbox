// Three.js Transpiler r165

import { vec4, mod, tslFn, float, floor, overloadingFn, mul, sub, vec3, fract, abs, dot, vec2, step, clamp, max, If } from 'three/nodes';

const permute_0 = tslFn( ( [ x_immutable ] ) => {

	const x = vec4( x_immutable ).toVar();

	return mod( x.mul( 34.0 ).add( 1.0 ).mul( x ), 289.0 );

} );

const permute_1 = tslFn( ( [ x_immutable ] ) => {

	const x = float( x_immutable ).toVar();

	return floor( mod( x.mul( 34.0 ).add( 1.0 ).mul( x ), 289.0 ) );

} );

const permute = overloadingFn( [ permute_0, permute_1 ] );

const taylorInvSqrt_0 = tslFn( ( [ r_immutable ] ) => {

	const r = vec4( r_immutable ).toVar();

	return sub( 1.79284291400159, mul( 0.85373472095314, r ) );

} );

const taylorInvSqrt_1 = tslFn( ( [ r_immutable ] ) => {

	const r = float( r_immutable ).toVar();

	return sub( 1.79284291400159, mul( 0.85373472095314, r ) );

} );

const taylorInvSqrt = overloadingFn( [ taylorInvSqrt_0, taylorInvSqrt_1 ] );

const grad4 = tslFn( ( [ j_immutable, ip_immutable ] ) => {

	const ip = vec4( ip_immutable ).toVar();
	const j = float( j_immutable ).toVar();
	const ones = vec4( 1.0, 1.0, 1.0, - 1.0 );
	const p = vec4().toVar();
	const s = vec4().toVar();
	p.xyz.assign( floor( fract( vec3( j ).mul( ip.xyz ) ).mul( 7.0 ) ).mul( ip.z ).sub( 1.0 ) );
	p.w.assign( sub( 1.5, dot( abs( p.xyz ), ones.xyz ) ) );

	s.x = s.x.lessThanAssign(p.x, 0.0, 1)
	s.y = s.y.lessThanAssign(p.y, 0.0, 1)
	s.z = s.z.lessThanAssign(p.z, 0.0, 1)
	s.w = s.w.lessThanAssign(p.w, 0.0, 1)

	p.xyz.assign( p.xyz.add( s.xyz.mul( 2.0 ).sub( 1.0 ).mul( s.www ) ) );

	return p;

} );

const simplexNoise4d = tslFn( ( [ v_immutable ] ) => {

	const v = vec4( v_immutable ).toVar();
	const C = vec2( 0.138196601125010504, 0.309016994374947451 );
	const i = vec4( floor( v.add( dot( v, C.yyyy ) ) ) ).toVar();
	const x0 = vec4( v.sub( i ).add( dot( i, C.xxxx ) ) ).toVar();
	const i0 = vec4().toVar();
	const isX = vec3( step( x0.yzw, x0.xxx ) ).toVar();
	const isYZ = vec3( step( x0.zww, x0.yyz ) ).toVar();
	i0.x.assign( isX.x.add( isX.y.add( isX.z ) ) );
	i0.yzw.assign( sub( 1.0, isX ) );
	i0.y.addAssign( isYZ.x.add( isYZ.y ) );
	i0.zw.addAssign( sub( 1.0, isYZ.xy ) );
	i0.z.addAssign( isYZ.z );
	i0.w.addAssign( sub( 1.0, isYZ.z ) );
	const i3 = vec4( clamp( i0, 0.0, 1.0 ) ).toVar();
	const i2 = vec4( clamp( i0.sub( 1.0 ), 0.0, 1.0 ) ).toVar();
	const i1 = vec4( clamp( i0.sub( 2.0 ), 0.0, 1.0 ) ).toVar();
	const x1 = vec4( x0.sub( i1 ).add( mul( 1.0, C.xxxx ) ) ).toVar();
	const x2 = vec4( x0.sub( i2 ).add( mul( 2.0, C.xxxx ) ) ).toVar();
	const x3 = vec4( x0.sub( i3 ).add( mul( 3.0, C.xxxx ) ) ).toVar();
	const x4 = vec4( x0.sub( 1.0 ).add( mul( 4.0, C.xxxx ) ) ).toVar();
	i.assign( mod( i, 289.0 ) );
	const j0 = float( permute( permute( permute( permute( i.w ).add( i.z ) ).add( i.y ) ).add( i.x ) ) ).toVar();
	const j1 = vec4( permute( permute( permute( permute( i.w.add( vec4( i1.w, i2.w, i3.w, 1.0 ) ) ).add( i.z.add( vec4( i1.z, i2.z, i3.z, 1.0 ) ) ) ).add( i.y.add( vec4( i1.y, i2.y, i3.y, 1.0 ) ) ) ).add( i.x.add( vec4( i1.x, i2.x, i3.x, 1.0 ) ) ) ) ).toVar();
	const ip = vec4( 1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0 ).toVar();
	const p0 = vec4( grad4( j0, ip ) ).toVar();
	const p1 = vec4( grad4( j1.x, ip ) ).toVar();
	const p2 = vec4( grad4( j1.y, ip ) ).toVar();
	const p3 = vec4( grad4( j1.z, ip ) ).toVar();
	const p4 = vec4( grad4( j1.w, ip ) ).toVar();
	const norm = vec4( taylorInvSqrt( vec4( dot( p0, p0 ), dot( p1, p1 ), dot( p2, p2 ), dot( p3, p3 ) ) ) ).toVar();
	p0.mulAssign( norm.x );
	p1.mulAssign( norm.y );
	p2.mulAssign( norm.z );
	p3.mulAssign( norm.w );
	p4.mulAssign( taylorInvSqrt( dot( p4, p4 ) ) );
	const m0 = vec3( max( sub( 0.6, vec3( dot( x0, x0 ), dot( x1, x1 ), dot( x2, x2 ) ) ), 0.0 ) ).toVar();
	const m1 = vec2( max( sub( 0.6, vec2( dot( x3, x3 ), dot( x4, x4 ) ) ), 0.0 ) ).toVar();
	m0.assign( m0.mul( m0 ) );
	m1.assign( m1.mul( m1 ) );

	return mul( 49.0, dot( m0.mul( m0 ), vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 ) ) ).add( dot( m1.mul( m1 ), vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) );

} );

// layouts

permute_0.setLayout( {
	name: 'permute_0',
	type: 'vec4',
	inputs: [
		{ name: 'x', type: 'vec4' }
	]
} );

permute_1.setLayout( {
	name: 'permute_1',
	type: 'float',
	inputs: [
		{ name: 'x', type: 'float' }
	]
} );

taylorInvSqrt_0.setLayout( {
	name: 'taylorInvSqrt_0',
	type: 'vec4',
	inputs: [
		{ name: 'r', type: 'vec4' }
	]
} );

taylorInvSqrt_1.setLayout( {
	name: 'taylorInvSqrt_1',
	type: 'float',
	inputs: [
		{ name: 'r', type: 'float' }
	]
} );

grad4.setLayout( {
	name: 'grad4',
	type: 'vec4',
	inputs: [
		{ name: 'j', type: 'float' },
		{ name: 'ip', type: 'vec4' }
	]
} );

simplexNoise4d.setLayout( {
	name: 'simplexNoise4d',
	type: 'float',
	inputs: [
		{ name: 'v', type: 'vec4' }
	]
} );

export { permute, taylorInvSqrt, grad4, simplexNoise4d };

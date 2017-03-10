// lenses
class Lens {
	constructor(getter, setter) {
		this.get = getter;
		this.put = setter;
	}
	focus(key) {
		return new CompositeLens(this, new KeyLens(key))
	}
}

class IdentityLens extends Lens {
	constructor() {
		super(v => v, (v, x) => { throw new Error("Cannot put.") })
	}
}

class KeyLens extends Lens {
	constructor(key) {
		super(v => v[key], (v, x) => (v[key] = x))
	}
}

class CompositeLens extends Lens {
	constructor(larger, smaller) {
		super(
			v => smaller.get(larger.get(v)),
			(v, x) => smaller.put(larger.get(v), x)
		)
	}
}


// store
class Store {
	constructor(target, lens, cotarget, colens) {
		this.target = target;
		this.lens = lens;

		this.cotarget = cotarget;
		this.colens = colens;
	}
	focus(vLens) { return new Store(this.target, vLens(this.lens), this.cotarget, this.colens) }
	cofocus(vLens) { return new Store(this.target, this.lens, this.cotarget, vLens(this.colens)) }
	fresh() {
		return new Store({}, new IdentityLens, this.cotarget, this.colens).focus(l => l.focus('<>'))
	}
	ap(m) { m(this); return this; }
	get() { return this.lens.get(this.target) }
	put(v) { this.lens.put(this.target, v); return this }
	pad(container) { if (!this.get()) this.put(container); return this; }
	coget() { return this.colens.get(this.cotarget) }
	coput(v) { this.colens.put(this.cotarget, v); return this }
}

// morphs
function put(x) { return s => s.put(x) }
function focus(k, m) { return s => m(s.focus(l => l.focus(k))) }
function deepFocus(ks, m) {
	if (!ks.length) return m;
	if (ks.length === 1) return focus(ks[0], m);
	return s => s.focus(l => l.focus(ks[0])).pad({}).ap(deepFocus(ks.slice(1), m))
}
function join(morphs) {
	return function (store) {
		for (let morph of morphs) store.ap(morph)
	}
}
function fresh(morph) {
	return function (store) {
		store.put(store.fresh().ap(morph).get())
	}
}
function biop(b) {
	return morph => store => store.put(b(store.get(), store.fresh().ap(morph).get()))
}
const id = m => m;
const opmap = {
	'=': id,
	':': id,
	'<-': id,
	':=': fresh,
	'++=': biop((x, y) => x.concat(y)),
	'+=': biop((x, y) => x + y),
	'-=': biop((x, y) => x - y),
	'*=': biop((x, y) => x * y),
	'/=': biop((x, y) => x / y),
	'%=': biop((x, y) => x % y)
}

module.exports = {
	Lens: Lens,
	Store: Store,
	IdentityLens: IdentityLens,
	put: put,
	focus: focus,
	deepFocus: deepFocus,
	join: join,
	fresh: fresh,
	opmap: opmap
}
let arr = [
    { name: 'a', v: 1.5 },
    { name: 'b', v: 2.3},
    { name: 'c', v: 2.1 },
    { name: 'd', v: 10},
    { name: 'e', v: 1 },
    { name: 'f', v: 1 },
    { name: 'g', v: 1 },
    { name: 'h', v: 2.3 },
    { name: 'i', v: 2.5 }
]
arr.sort((a, b) => a.v - b.v);
// b-a = desc
// best player first
let  b =[]
let l = arr.length-1
let L = l/2;     
for(var i=0; i<L; i++) b.push( arr[l-i] ,arr[i] );
if(arr.length%2) b.push( arr[i] );
console.log(b)


let teams = [
    { n: 'a', s: { a: 0, p: [] } },
    { n: 'b', s: { a: 0, p: [] } },
    { n: 'c', s: { a: 0, p: [] } }
]
let alt = true
b.forEach(r => {
    console.log(r)
    if(alt){
        //good players
        teams.sort((a, b) => (a.s.a - b.s.a) * ((3-a.s.p.length)/(3-a.s.p.length))) //get worst team
        teams[0].s.p.push(r.name)
        teams[0].s.a = ((teams[0].s.a * (teams[0].s.p.length-1)) + r.v)/(teams[0].s.p.length)
        
    } else {
        teams.sort((a, b) => (b.s.a - a.s.a) * ((3-a.s.p.length)/(3-a.s.p.length))) //get best team
        teams[0].s.p.push(r.name)
        teams[0].s.a = ((teams[0].s.a * (teams[0].s.p.length-1)) + r.v)/(teams[0].s.p.length)
    }
    alt = !alt
    console.table(teams)
    
})
teams.forEach(t=>{
    console.log(t.n)
    console.table(t.s.p)
  })
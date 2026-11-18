import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starsScore, postureScore, reputationValue } from './reputation';
test('estrelas aceitam somente inteiros de 1 a 5',()=>{assert.equal(starsScore.parse(1),1);assert.equal(starsScore.parse(5),5);for(const n of [0,6,2.5])assert.equal(starsScore.safeParse(n).success,false);});
test('postura aceita 0 a 100 independentemente das estrelas',()=>{assert.equal(postureScore.parse(0),0);assert.equal(postureScore.parse(100),100);for(const n of [-1,101,50.5])assert.equal(postureScore.safeParse(n).success,false);});
test('ausência de avaliações nunca produz nota fictícia',()=>{assert.equal(reputationValue(null),'—');assert.equal(reputationValue(null,true),'—');assert.equal(reputationValue(0,true),'0%');});
test('estrelas têm uma casa decimal e postura porcentagem',()=>{assert.equal(reputationValue(4.26),'4.3');assert.equal(reputationValue(72.5,true),'73%');});

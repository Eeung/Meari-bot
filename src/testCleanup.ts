import { cleanupOldFiles } from '@/storage/cleanupOldFiles.js';

console.log('[TEST CLEANUP] running manually...');
cleanupOldFiles({force:true});
console.log('[TEST CLEANUP] done');
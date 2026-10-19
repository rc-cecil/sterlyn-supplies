import 'dotenv/config';
import {db} from '../src/lib/db';
import {syncCatalogueContent} from './catalogue-content';
try{console.log('Illustrative catalogue refresh:',await syncCatalogueContent());}finally{await db.$disconnect();}

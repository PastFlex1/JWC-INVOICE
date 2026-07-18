import { db } from './src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function run() {
  for (const folder of ['INBOX', 'Sent Items', 'Sent']) {
    const d = await getDoc(doc(db, 'email_sync_state', folder));
    if (d.exists()) {
       console.log(`Folder ${folder}: lastUid = ${d.data().lastUid}`);
    } else {
       console.log(`Folder ${folder}: No state found`);
    }
  }
}

run().catch(console.error);

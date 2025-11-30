import { useState, useEffect } from 'react';
import { MantineProvider, Modal, TextInput, PasswordInput, Button, Stack, Text, Group } from '@mantine/core';
import { IconLock, IconAlertCircle, IconEye, IconEyeOff } from '@tabler/icons-react';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { Client, Databases, Storage, ID } from 'appwrite';
import WishlistView from './components/WishListView';
import AdminView from './components/AdminView';

const client = new Client()
.setEndpoint(process.env.REACT_APP_APPWRITE_ENDPOINT)
.setProject(process.env.REACT_APP_APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.REACT_APP_APPWRITE_PRODUCTS_COLLECTION_ID;
const BUCKET_ID = process.env.REACT_APP_APPWRITE_BUCKET_ID || '692c747d000ed7634d25';
const PROJECT_ID = process.env.REACT_APP_APPWRITE_PROJECT_ID;
const ADMIN_PASSWORD = 'dittlösenord';

function App() {
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
const [isAdmin, setIsAdmin] = useState(false);
const [modalOpened, setModalOpened] = useState(false);
const [adminPasswordInput, setAdminPasswordInput] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [error, setError] = useState(false);

useEffect(() => {
loadProducts();
}, []);

const loadProducts = async () => {
try {
setLoading(true);
const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
setProducts(response.documents);
} catch (error) {
console.error('Fel vid laddning av produkter:', error);
} finally {
setLoading(false);
}
};

const getImageUrl = (fileId) => {
if (fileId && fileId.startsWith('http')) return fileId;
if (fileId) return `https://fra.cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;
return '[https://via.placeholder.com/400](https://via.placeholder.com/400)';
};

const uploadImage = async (file) => {
const response = await storage.createFile(BUCKET_ID, ID.unique(), file);
return response.$id;
};

const deleteImage = async (fileId) => {
if (!fileId || fileId.startsWith('http')) return;
await storage.deleteFile(BUCKET_ID, fileId);
};

const addProduct = async (productData) => {
const response = await databases.createDocument(
DATABASE_ID,
COLLECTION_ID,
ID.unique(),
{ ...productData, claimed: false, claimedBy: null }
);
setProducts([...products, response]);
};

const removeProduct = async (productId) => {
const product = products.find(p => p.$id === productId);
await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, productId);
if (product?.image) await deleteImage(product.image);
setProducts(products.filter(p => p.$id !== productId));
};

const removeAllProducts = async () => {
for (const product of products) {
await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, product.$id);
if (product.image) await deleteImage(product.image);
}
setProducts([]);
};

const claimProduct = async (productId, name) => {
const product = products.find(p => p.$id === productId);
await databases.updateDocument(DATABASE_ID, COLLECTION_ID, productId, {
claimed: !product.claimed,
claimedBy: !product.claimed ? name : null,
});
setProducts(products.map(p => p.$id === productId ? { ...p, claimed: !p.claimed, claimedBy: !p.claimed ? name : null } : p));
};

const handleAdminLogin = () => {
setModalOpened(true);
setError(false);
setAdminPasswordInput('');
};

const handleModalSubmit = () => {
if (adminPasswordInput === ADMIN_PASSWORD) {
setIsAdmin(true);
setModalOpened(false);
setAdminPasswordInput('');
setError(false);
} else {
setError(true);
}
};

if (isAdmin) {
return ( <MantineProvider> <Notifications position="top-right" />
<AdminView
products={products}
loading={loading}
onAddProduct={addProduct}
onRemoveProduct={removeProduct}
onRemoveAll={removeAllProducts}
onBackToPublic={() => setIsAdmin(false)}
uploadImage={uploadImage}
getImageUrl={getImageUrl}
/> </MantineProvider>
);
}

return ( <MantineProvider> <Notifications position="top-right" />
<WishlistView
products={products}
loading={loading}
onClaimProduct={claimProduct}
onUnclaimProduct={(id) => claimProduct(id, '')}
onGoToAdmin={handleAdminLogin}
getImageUrl={getImageUrl}
/>


  <Modal
    opened={modalOpened}
    onClose={() => setModalOpened(false)}
    title="Admin-lösenord"
    centered
  >
    <Stack>
      <Text>Vänligen ange admin-lösenordet för att fortsätta:</Text>
      <PasswordInput
        placeholder="Lösenord"
        value={adminPasswordInput}
        onChange={(e) => setAdminPasswordInput(e.currentTarget.value)}
        icon={<IconLock />}
        visible={showPassword}
        onVisibilityChange={setShowPassword}
        error={error && <Group spacing="xs"><IconAlertCircle size={16} /> <Text color="red">Fel lösenord</Text></Group>}
      />
      <Button fullWidth onClick={handleModalSubmit}>Logga in</Button>
    </Stack>
  </Modal>
</MantineProvider>


);
}

export default App;

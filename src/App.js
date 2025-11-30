import { useState, useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
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
    try {
      if (fileId && fileId.startsWith('http')) {
        return fileId;
      }
      
      if (fileId) {
        return `https://fra.cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;
      }
      
      return 'https://via.placeholder.com/400';
    } catch (error) {
      console.error('Kunde inte hämta bild-URL:', error);
      return 'https://via.placeholder.com/400';
    }
  };

  const uploadImage = async (file) => {
    try {
      const response = await storage.createFile(
        BUCKET_ID,
        ID.unique(),
        file
      );
      
      return response.$id;
    } catch (error) {
      console.error('Bilduppladdning misslyckades:', error);
      throw error;
    }
  };

  const deleteImage = async (fileId) => {
    try {
      if (!fileId || fileId.startsWith('http')) {
        console.log('Hoppar över borttagning av extern bild-URL');
        return;
      }
      
      await storage.deleteFile(BUCKET_ID, fileId);
      console.log('Bild borttagen från bucket:', fileId);
    } catch (error) {
      console.warn('Kunde inte ta bort bild från bucket:', error);
    }
  };

  const addProduct = async (productData) => {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
          title: productData.title,
          price: productData.price,
          image: productData.image,
          url: productData.url,
          quantity: productData.quantity || 1,
          claimed: false,
          claimedBy: null
        }
      );
      
      setProducts([...products, response]);
    } catch (error) {
      console.error('Fel vid tillägg av produkt:', error);
      throw error;
    }
  };

  const removeProduct = async (productId) => {
    try {
      const product = products.find(p => p.$id === productId);
      
      await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, productId);
      
      if (product && product.image) {
        await deleteImage(product.image);
      }
      
      setProducts(products.filter(p => p.$id !== productId));
    } catch (error) {
      console.error('Fel vid borttagning:', error);
    }
  };

  const removeAllProducts = async () => {
    try {
      for (const product of products) {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, product.$id);
        
        if (product.image) {
          await deleteImage(product.image);
        }
      }
      
      setProducts([]);
    } catch (error) {
      console.error('Fel vid borttagning av alla produkter:', error);
    }
  };

  const claimProduct = async (productId, name) => {
    try {
      const product = products.find(p => p.$id === productId);
      
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        productId,
        {
          claimed: !product.claimed,
          claimedBy: !product.claimed ? name : null
        }
      );
      
      setProducts(products.map(p => 
        p.$id === productId 
          ? { ...p, claimed: !p.claimed, claimedBy: !p.claimed ? name : null }
          : p
      ));
    } catch (error) {
      console.error('Fel vid claim:', error);
      throw error;
    }
  };

  const unclaimProduct = async (productId) => {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        productId,
        {
          claimed: false,
          claimedBy: null
        }
      );
      
      setProducts(products.map(p => 
        p.$id === productId 
          ? { ...p, claimed: false, claimedBy: null }
          : p
      ));
    } catch (error) {
      console.error('Fel vid unclaim:', error);
      throw error;
    }
  };

  const handleAdminLogin = () => {
    const password = prompt('Ange admin-lösenord:');
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
    } else {
      alert('Fel lösenord!');
    }
  };

  if (isAdmin) {
    return (
      <MantineProvider>
        <Notifications position="top-right" />
        <AdminView
          products={products}
          loading={loading}
          onAddProduct={addProduct}
          onRemoveProduct={removeProduct}
          onRemoveAll={removeAllProducts}
          onBackToPublic={() => setIsAdmin(false)}
          uploadImage={uploadImage}
          getImageUrl={getImageUrl}
        />
      </MantineProvider>
    );
  }

  return (
    <MantineProvider>
      <Notifications position="top-right" />
      <WishlistView
        products={products}
        loading={loading}
        onClaimProduct={claimProduct}
        onUnclaimProduct={unclaimProduct}
        onGoToAdmin={handleAdminLogin}
        getImageUrl={getImageUrl}
      />
    </MantineProvider>
  );
}

export default App;
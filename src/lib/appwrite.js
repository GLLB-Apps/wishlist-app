// src/lib/appwrite.js
import { Client, Databases, ID } from 'appwrite';

// Appwrite Configuration
const client = new Client();

client
  .setEndpoint(process.env.REACT_APP_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.REACT_APP_APPWRITE_PROJECT_ID || 'swl');

export const databases = new Databases(client);

// Database och Collection/Table IDs
export const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || 'wishlist-db';
export const PRODUCTS_COLLECTION_ID = process.env.REACT_APP_APPWRITE_PRODUCTS_COLLECTION_ID || 'wishlist_table';

// Product Service
export const productService = {
  // Hämta alla produkter
  async getProducts() {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        PRODUCTS_COLLECTION_ID
      );
      return response.documents;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Lägg till produkt
  async createProduct(productData) {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION_ID,
        ID.unique(),
        productData
      );
      return response;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  // Uppdatera produkt
  async updateProduct(documentId, productData) {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION_ID,
        documentId,
        productData
      );
      return response;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Ta bort produkt
  async deleteProduct(documentId) {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION_ID,
        documentId
      );
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  // Claima produkt
  async claimProduct(documentId, claimerName) {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION_ID,
        documentId,
        {
          claimed: true,
          claimedBy: claimerName
        }
      );
      return response;
    } catch (error) {
      console.error('Error claiming product:', error);
      throw error;
    }
  },

  // Ta bort claim
  async unclaimProduct(documentId) {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION_ID,
        documentId,
        {
          claimed: false,
          claimedBy: null
        }
      );
      return response;
    } catch (error) {
      console.error('Error unclaiming product:', error);
      throw error;
    }
  }
};

export { client };
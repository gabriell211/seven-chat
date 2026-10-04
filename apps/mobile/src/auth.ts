import * as SecureStore from "expo-secure-store";
const TOKEN_KEY="seven_access_token";
export async function getToken(){return SecureStore.getItemAsync(TOKEN_KEY);}
export async function setToken(token:string){await SecureStore.setItemAsync(TOKEN_KEY,token,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});}
export async function clearToken(){await SecureStore.deleteItemAsync(TOKEN_KEY);}
import { getAuthToken } from '../api/auth';
import { decodeToken, isTokenExpired } from './jwt';

export const getTokenInfo = () => {
  const authToken = getAuthToken();
  const decoded = authToken ? decodeToken(authToken) : null;
  
  return {
    hasAuthToken: !!authToken,
    authTokenLength: authToken?.length || 0,
    expiration: decoded ? new Date(decoded.exp * 1000) : null,
    isExpired: authToken ? isTokenExpired(authToken) : true,
    userInfo: decoded
  };
};

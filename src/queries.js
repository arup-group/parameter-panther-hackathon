export const objectQuery = (streamId, objectId) => `query {
    stream( id: "${streamId}" ) 
    {
      object( id: "${objectId}" ) 
      {
        data
      }
    }
  }`
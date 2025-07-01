import { useEffect, useState } from 'react';
import { createAdminUser } from '../firebase';

const Setup = () => {
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    // Only run setup once
    if (!setupComplete) {
      const runSetup = async () => {
        try {
          await createAdminUser();
          setSetupComplete(true);
        } catch (error) {
          console.error("Setup error:", error);
        }
      };
      
      runSetup();
    }
  }, [setupComplete]);

  return null;
};

export default Setup; 

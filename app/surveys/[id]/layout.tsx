import React from 'react';

const Layout = ({ children } : React.PropsWithChildren) => {
  return (
    <div className="md:grid md:grid-cols-4 mb-4">
      <div className="col-start-2 col-span-2">
        {children}
      </div>
    </div>
  );
};

export default Layout;

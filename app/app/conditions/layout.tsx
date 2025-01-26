
const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="p-2 md:p-10">
            {children}
        </div>
    )
}

export default Layout;
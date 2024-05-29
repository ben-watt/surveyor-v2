"use client";
interface TableProps extends React.PropsWithChildren {
  headers: string[];
}
export const Table = ({ headers, children }: TableProps) => {
  return (
    <div>
      <div className="-m-1.5 overflow-x-auto">
        <div className="p-1.5 min-w-full inline-block align-middle">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  {headers.map((h) => {
                    return (
                      <th
                        scope="col"
                        className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase"
                      >
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};interface TableRowProps extends React.PropsWithChildren {
  id: string;
}
export const TableRow = ({ id, children }: TableRowProps) => {
  return (
    <tr key={id}>
      {children}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200"></td>
    </tr>
  );
};


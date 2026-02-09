export default function LogsTable({ logs }) {
    return (
      <table className="logs-table">
        <thead>
          <tr>
            <th>Machine</th>
            <th>Cycle</th>
            <th>Status</th>
            <th>Supervisor</th>
            <th>Color</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.log_id}>
              <td>{log.machine_code}</td>
              <td>
                {new Date(log.cycle_start_time).toLocaleTimeString()}
                {" - "}
                {new Date(log.cycle_end_time).toLocaleTimeString()}
              </td>
              <td className={log.status === "delay" ? "red" : "green"}>
                {log.status.toUpperCase()}
              </td>
              <td className={
                log.supervisor_confirmation === "CONFIRMED"
                  ? "green"
                  : log.supervisor_confirmation === "NOT_CONFIRMED"
                  ? "red"
                  : "gray"
              }>
                {log.supervisor_confirmation}
              </td>
              <td>{log.color}</td>
              <td>
                {new Date(log.operator_press_time).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  
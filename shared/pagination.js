export function paginate(queryFn, { table, where = '1=1', params = [], cursor, limit = 20, orderBy = 'id', order = 'DESC' }) {
  let sql;
  let queryParams;

  if (cursor) {
    const op = order === 'DESC' ? '<' : '>';
    sql = `SELECT * FROM ${table} WHERE ${where} AND ${orderBy} ${op} ? ORDER BY ${orderBy} ${order} LIMIT ?`;
    queryParams = [...params, cursor, limit + 1];
  } else {
    sql = `SELECT * FROM ${table} WHERE ${where} ORDER BY ${orderBy} ${order} LIMIT ?`;
    queryParams = [...params, limit + 1];
  }

  const items = queryFn(sql, queryParams);
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1][orderBy] : null;

  return { data, nextCursor, hasMore };
}

export function encodeCursor(id) {
  return Buffer.from(String(id)).toString('base64url');
}

export function decodeCursor(cursor) {
  return parseInt(Buffer.from(cursor, 'base64url').toString(), 10);
}

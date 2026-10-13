/** V1 shares one mutable SessionState between its hooks and tools. */
export function createExclusiveRunner() {
    let pending: Promise<unknown> = Promise.resolve()
    return function exclusive<Args extends unknown[], Result>(fn: (...args: Args) => Promise<Result>) {
        return (...args: Args): Promise<Result> => {
            const next = pending.then(() => fn(...args))
            pending = next.catch(() => {})
            return next
        }
    }
}

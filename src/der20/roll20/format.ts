export function parseCommaSeparatedList(list: string): string[] {
    return list.split(',').map((item) => {
        return item.trim();
    });
}
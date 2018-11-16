export function makeImageSourceURL(imageSource: string) {
    if (imageSource.includes('?')) {
        return thumbify(imageSource);
    }
    let midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    let cacheDefeat = `${midnight.valueOf() / 1000}`;
    return thumbify(`${imageSource}?${cacheDefeat}`);
}

export function thumbify(imageSource: string) {
    return imageSource.replace(/\/[a-z]+\.png(\?[0-9]+)$/, '/thumb.png$1');
}

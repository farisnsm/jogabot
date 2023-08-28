let pages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function pagi(arr, pageSize, pageNo) {
    return (arr.slice(pageSize * (pageNo - 1), pageSize *pageNo))
}

console.log(pagi(pages, 3, 4))
(function () {
  // config
  const BASE_URL = 'https://lighthouse-user-api.herokuapp.com'
  const INDEX_URL = BASE_URL + '/api/v1/users'
  const SHOW_URL = BASE_URL + '/api/v1/users/'
  const ITEM_PER_PAGE = 12
  const FIXED_PAGINATION = 10
  const SHOW_HINT_TIMES = 3
  const icon = {
    female: '<span><i class="fas fa-venus text-danger"></i></span>',
    male: '<span"><i class="fas fa-mars text-primary"></i></span>',
    birthday: '<i class="fas fa-birthday-cake text-info"></i>',
    email: '<i class="fas fa-envelope text-info"></i>',
    region: '<i class="fas fa-map-marker-alt text-info"></i>',
    like: '<i class="fas fa-heart like text-danger"></i>',
    unlike: '<i class="far fa-heart unlike"></i>'
  }

  // elements
  const dataPanel = document.querySelector('#data-panel')
  const modalTitle = document.querySelector('#show-modal-title')
  const modalBody = document.querySelector('#show-modal-body')
  const modal = document.querySelector('#show-modal')
  const searchForm = document.querySelector('#search-form')
  const searchGender = document.querySelector('#search-gender')
  const searchName = document.querySelector('#search-name')
  const pagination = document.querySelector('#pagination')
  const viewTypeIcon = document.querySelector('#view-type-icon')
  const navbar = document.querySelector('.navbar')

  // params initial
  const dataSource = [] // The original from API source
  let pageDataSource = [] // Right now page's source, from search or favorite
  const likeTotal = {}
  let myFavoriteList = JSON.parse(localStorage.getItem('likeUsers')) || [] // only store id
  let nowPageNum = 1 // default page 1
  let viewType = 'card'
  let pageType = 'home'

  // Get users list (data from API) and write it to panal
  axios.get(INDEX_URL)
    .then((response) => {
      dataSource.push(...response.data.results)
      showHomePage()
      initialData(dataSource)
    })
    .catch((error) => console.log(error))

  // Listen to nav item click
  navbar.addEventListener('click', (event) => {
    if (event.target.id === 'home') {
      showHomePage()
    } else if (event.target.id === 'billboard') {
      showBillboardPage()
    } else if (event.target.id === 'favorite') {
      showFavoritePage()
    }
  })

  // Listen to click event from card image or list content, then show modal (data from API)
  dataPanel.addEventListener('click', (event) => {
    if (event.target.classList.contains('user-img-list')) {
      showUserDetail(event.target.dataset.id)
    }
  })

  // Listen to double click img, then add to likes
  modal.addEventListener('dblclick', (event) => {
    if (event.target.tagName === 'IMG') {
      changeLikeIcon(event.target.dataset.id, writeToLike)
    }
  })

  // Listen to billboard modal click event
  modal.addEventListener('click', function (event) {
    if (event.target.classList.contains('billboardList')) {
      showUserDetail(event.target.dataset.id, modalGoBackButton)
    } else if (event.target.classList.contains('backto-billboard-btn')) {
      showBillboardPage()
    } else if (event.target.classList.contains('fa-heart')) {
      changeLikeIcon(this.querySelector('img.avatar').dataset.id, writeToLike)
    }
  })

  // Listen to search form name input
  searchForm.addEventListener('input', (event) => {
    // event.preventDefault()
    searchUser()
  })

  // Listen to search gender click
  searchGender.addEventListener('click', (event) => {
    searchGender.previousElementSibling.textContent = event.target.textContent
    searchUser()
  })

  // Listen to page number click
  pagination.addEventListener('click', (event) => {
    if (event.target.tagName === 'A') setPageData(event.target.dataset.page)
  })

  // Listen to view type click
  viewTypeIcon.addEventListener('click', (event) => {
    if (event.target.tagName === 'I') {
      viewType = event.target.classList.contains('fa-bars') ? 'list' : 'card'
    } else if (event.target.classList.contains('dropdown-item')) {
      viewType = event.target.id.substr(event.target.id.indexOf('-') + 1)
    }
    setPageData(nowPageNum)
  })


  // === Random each user's like (pretend getting data from DB)
  function initialData(data) {
    // select how many users (Count from 0-200)
    let userCount = Math.floor(Math.random() * 201)
    // let userCount = 3

    while (userCount > 0) {
      // select which user (id from 401-600)
      const userID = Math.floor(Math.random() * 200 + 401)
      // give how many likes to the user (Count from 1-100)
      const userLike = Math.floor(Math.random() * 100 + 1)

      // search user's name
      const userName = data.find(element => element.id === userID).name

      if (Object.keys(likeTotal).includes(userID)) {
        likeTotal[userID].like += userLike
      } else {
        likeTotal[userID] = {
          id: +userID,
          name: userName,
          like: userLike
        }
      }

      userCount--
    }
  }

  function showHomePage() {
    resetSearchValue()
    pageType = 'home'
    document.querySelector('#favorite').parentElement.classList.remove('active')

    setPagination(dataSource)
    setPageData(1, dataSource)
  }

  function showBillboardPage() {
    // Before sending request: remove old data and show loading
    modalTitle.innerHTML = ''
    modalBody.innerHTML = `
      <div class="row justify-content-center">
        <div class="spinner-border text-muted"></div>
      </div>
    `
    modalGoBackButton('hide')

    // Rank likeTotal from big to small (Sort will change array, so use map to copy first)
    const likeTotalRank = Object.values(likeTotal).map((element) => element)
    likeTotalRank.sort(function (a, b) {
      // 1: set a after b / -1: set a before b
      return a.like < b.like ? 1 : -1;
    });

    // Put total info into modal element, and use Grid System in modal
    let listContent = ''

    Object.values(likeTotalRank).forEach(element => {
      listContent += `
        <li class="list-group-item billboardList" data-id="${element.id}">
          <div class="d-flex">
           <div>${element.name}</div>
           <div class="ml-auto"><span class="badge badge-warning">${element.like}</span> likes</div>
        </li>
      `
    });

    let htmlContent = `
    <div class="alert alert-primary" role="alert">
      You can click the list to see user info.
    </div>
      <div class="row align-items-center">
        <div class="col-12">
          <ul class="list-group">
            ${listContent}
          </ul>
        </div>
      </div>
    `
    modalTitle.innerHTML = 'Billboard'
    modalBody.innerHTML = htmlContent
  }

  function showFavoritePage() {
    nowPageNum = 1
    pageType = 'favorite'
    resetSearchValue()
    document.querySelector('#favorite').parentElement.classList.add('active')

    let favoriteData = dataSource.filter((item) => myFavoriteList.indexOf(String(item.id)) > -1)
    setPagination(favoriteData)
    setPageData(1, favoriteData)
  }

  // === Set pagination
  function setPagination(data) {
    let totalPage = Math.ceil(data.length / ITEM_PER_PAGE)
    let htmlContent = ''

    if (totalPage > 0) {
      for (let i = 0; i < totalPage; i++) {
        htmlContent += `<li class="page-item"><a class="page-link" href="javascript:;" data-page="${i + 1}">${i + 1}</a></li>`
      }

      htmlContent = `
      <li class="page-item">
        <a class="page-link page-default" href="javascript:;" aria-label="Previous" data-page="">
          <span aria-hidden="true">&laquo;</span>
          <span class="sr-only">Previous</span>
        </a>
      </li>
      ${htmlContent}
      <li class="page-item">
        <a class="page-link page-default" href="javascript:;" aria-label="Next" data-page="">
          <span aria-hidden="true">&raquo;</span>
          <span class="sr-only">Next</span>
        </a>
      </li>
      `
    }

    pagination.innerHTML = htmlContent
  }

  // === only show fixed num pages
  function setLimitPagination(pageNum, totalPage) {
    // set limit
    let countLimit1, countLimit2
    if (FIXED_PAGINATION % 2 === 0) {
      [countLimit1, countLimit2] = [Math.ceil(FIXED_PAGINATION / 2), Math.floor(FIXED_PAGINATION / 2) - 1]
    } else {
      [countLimit1, countLimit2] = [Math.floor(FIXED_PAGINATION / 2), Math.floor(FIXED_PAGINATION / 2)]
    }
    // set show range
    let fromPage, toPage
    if ((pageNum - 1) <= countLimit1) {
      [fromPage, toPage] = [1, FIXED_PAGINATION]
    } else if ((totalPage - pageNum) <= countLimit2) {
      [fromPage, toPage] = [totalPage - FIXED_PAGINATION + 1, totalPage]
    } else {
      [fromPage, toPage] = [pageNum - countLimit1, pageNum + countLimit2]
    }

    return [fromPage, toPage]
  }

  // === Set page data
  function setPageData(pageNum, data) {
    // params initial
    pageNum = Number(pageNum)

    // Decide data source
    pageDataSource = data || pageDataSource

    // Set page in pagination
    if (pageDataSource.length > 0) {
      let totalPage = Math.ceil(pageDataSource.length / ITEM_PER_PAGE)
      const pagePreviousBtn = document.querySelector('[aria-label="Previous"]')
      const pageNextBtn = document.querySelector('[aria-label="Next"]')

      // only show fixed num pages
      let [fromPage, toPage] = setLimitPagination(pageNum, totalPage)

      // set show and hidden page
      const pages = document.querySelectorAll('[data-page]:not(.page-default)')
      pages.forEach(element => {
        element.classList.add('d-none')
        if (element.dataset.page >= fromPage && element.dataset.page <= toPage) element.classList.remove('d-none')
      })

      // set active page
      document.querySelector(`[data-page="${nowPageNum}"]:not(.page-default)`).parentElement.classList.remove('active')
      document.querySelector(`[data-page="${pageNum}"]:not(.page-default)`).parentElement.classList.add('active')
      nowPageNum = pageNum

      // set previous page button
      if (pageNum === 1) pagePreviousBtn.classList.add('d-none')
      else {
        pagePreviousBtn.classList.remove('d-none')
        pagePreviousBtn.dataset.page = pageNum - 1
      }

      // set next page button
      if (pageNum === totalPage) pageNextBtn.classList.add('d-none')
      else {
        pageNextBtn.classList.remove('d-none')
        pageNextBtn.dataset.page = pageNum + 1
      }
    }

    // Decide and show page data
    let start = (pageNum - 1) * ITEM_PER_PAGE
    let pageData = pageDataSource.slice(start, start + ITEM_PER_PAGE) // slice doesn't include end
    displayDataList(pageData)
  }

  // === Show page data
  function displayDataList(data) {
    // param initial
    let htmlContent = ''

    // Before sending request: remove old data and show loading
    dataPanel.innerHTML = `
      <div class="row justify-content-center">
        <div class="spinner-border text-muted"></div>
      </div>
    `

    if (data.length > 0) {
      if (viewType === 'card') {
        data.forEach((element) => {
          htmlContent += `
            <div class="col-auto user-img-list" data-toggle="modal" data-target="#show-modal" data-id="${element.id}">
              <img src="${element.avatar}" alt="${element.name}\'s photo" class="img-fluid">
              <div class="overlay">
                <div class="overlay-text"">${element.name}</div>
              </div>
            </div>
          `
        });
      } else if (viewType === 'list') {
        // two users per line
        htmlContent += `<div class="container">`
        data.forEach((element, index) => {
          if (index % 2 === 0) htmlContent += `<div class="row justify-content-center">`
          htmlContent += `
            <div class="col-6">
              <div class="list-group">
                <a href="javascript:;" class="list-group-item list-group-item-action user-img-list" data-toggle="modal" data-target="#show-modal" data-id="${element.id}">
                  <div class="row">
                    <div class="col-4 my-auto">
                      <img src="${element.avatar}" alt="${element.name}\'s photo" class="img-fluid">
                    </div>
                    <div class="col-8 my-auto text-center">
                      <span>${element.name}</span>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          `
          if (index % 2 === 1) htmlContent += `</div>`
        })
        htmlContent += `</div>`
      }
    } else {
      htmlContent = `
        <div class="alert alert-danger" role="alert">
          Sorry! We couldn't find any user.
        </div>
      `
    }

    dataPanel.innerHTML = htmlContent
  }

  // === Show user modal detail
  function showUserDetail(id, action) {
    const url = SHOW_URL + id

    // Before sending request: remove old data and show loading
    modalTitle.innerHTML = ''
    modalBody.innerHTML = `
      <div class="row justify-content-center">
        <div class="spinner-border text-muted"></div>
      </div>
    `
    modalGoBackButton('hide')

    axios.get(url)
      .then((response) => {
        const user = response.data
        let titleIcon, clickAvatarHintClass, tooltopHTML

        // Check if the user in favorite
        if (myFavoriteList.some((item) => +item === +id)) titleIcon = `${icon.like}`
        else titleIcon = `${icon.unlike}`

        // Decide show the avatar click hint or not
        clickAvatarHintClass = 'click-avatar-hint'
        tooltopHTML = `data-toggle="tooltip" data-placement="top" title="Double click the image to add to / cancel from your favorite ."`
        let checkUserTimes = Number(localStorage.getItem('checkUserTimes'))
        if (checkUserTimes >= SHOW_HINT_TIMES) {
          clickAvatarHintClass = ''
          tooltopHTML = ''
        }

        // Put detail info into modal element, and use Grid System in modal
        let htmlContent = `
          <div class="row align-items-center">
            <div class="col-sm-12 col-md-6 col-lg-6 text-center">
              <img src="${user.avatar}" class="img-fluid rounded-circle avatar ${clickAvatarHintClass}" ${tooltopHTML} data-id="${id}">
              <h3>${user.name} ${user.surname}  ${icon[user.gender]}</h3>
            </div>
            <div class="col-sm-12 col-md-6 col-lg-6">
              <ul class="list-group">
                <li class="list-group-item">${icon.birthday}  ${user.birthday} (${user.age})</li>
                <li class="list-group-item">${icon.email}  ${user.email}</li>
                <li class="list-group-item">${icon.region}  ${user.region}</li>
                <li class="list-group-item"><span class="font-weight-bold">Join From</span> ${Date(user.created_at)}</li>
                <li class="list-group-item"><span class="font-weight-bold">Latest Update Time is</span> ${Date(user.updated_at)}</li>
              </ul>
            </div>
          </div>
        `
        modalTitle.innerHTML = titleIcon
        modalBody.innerHTML = htmlContent

        // Activate the tootip with jQuery
        if (checkUserTimes < SHOW_HINT_TIMES) {
          $('[data-toggle="tooltip"]').tooltip()
          $('.avatar').trigger('mouseenter')
          setTimeout(function () { $('.avatar').trigger('mouseleave') }, 3500)
        }
      })
      .catch((error) => console.log(error))

    if (typeof action !== 'undefined') action()

    // Record the check user times to localStorage
    let checkUserTimes = Number(localStorage.getItem('checkUserTimes')) + 1
    if (checkUserTimes <= SHOW_HINT_TIMES) localStorage.setItem('checkUserTimes', JSON.stringify(checkUserTimes))
  }

  // === Update like icon in modal
  function changeLikeIcon(userID, action) {
    if (modalTitle.children[0].classList.contains('unlike')) {
      modalTitle.innerHTML = icon.like
      action(userID, 'like')
    } else {
      modalTitle.innerHTML = icon.unlike
      action(userID, 'unlike')
    }

    // update page content
    if (pageType === 'favorite') {
      // if (searchName.value) searchUser()
      // else showFavoritePage()
      searchUser()
    }
  }

  // === Update like data (mine in localStorage, total in array)
  function writeToLike(userID, type) {
    const user = dataSource.find((item) => +item.id === +userID)
    const index = myFavoriteList.findIndex((item) => +item === +userID)

    if (type === 'like') {
      // Mine
      if (index === -1) myFavoriteList.push(userID)
      // Total
      if (Object.keys(likeTotal).includes(userID)) {
        likeTotal[userID].like += 1
      } else {
        likeTotal[userID] = {
          id: +userID,
          name: `${dataSource.find(element => element.id === +userID).name}`,
          like: 1
        }
      }
    } else if (type === 'unlike') {
      // Mine
      if (index !== -1) myFavoriteList.splice(index, 1)
      // Total
      if (myFavoriteList.some((item) => +item === userID))
        likeTotal[userID].like -= 1
    }

    localStorage.setItem('likeUsers', JSON.stringify(myFavoriteList))
  }

  // === Search user
  function searchUser() {
    let targetData
    nowPageNum = 1

    // Decide data source
    if (pageType === 'favorite') {
      targetData = dataSource.filter((item) => myFavoriteList.indexOf(String(item.id)) > -1)
    } else targetData = dataSource

    // gender select
    let genderSelected = searchGender.previousElementSibling.textContent
    if (genderSelected === 'All Gender') genderSelected = ''
    else genderSelected = genderSelected.toLowerCase()

    // name input
    const regex = new RegExp(searchName.value, 'i')

    // do the search
    const searchResult = targetData.filter((user) => {
      let matchFlag = true

      if (genderSelected && (user.gender !== genderSelected)) matchFlag = false
      else if (!user.name.match(regex)) matchFlag = false

      if (matchFlag) return user
    })

    setPagination(searchResult)
    setPageData(1, searchResult)
  }

  // === Update modal go back button (show / hide)
  function modalGoBackButton(action) {
    const backToBillboard = document.querySelector('.backto-billboard-btn')
    action = action || 'show'

    if (action === 'show') {
      backToBillboard.classList.remove('d-none')
      backToBillboard.classList.add('d-inline-block')
    } else if (action === 'hide') {
      backToBillboard.classList.remove('d-inline-block')
      backToBillboard.classList.add('d-none')
    }
  }

  function resetSearchValue() {
    searchName.value = ''
    searchGender.previousElementSibling.textContent = 'All Gender'
  }
})()
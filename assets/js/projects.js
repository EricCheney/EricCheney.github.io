$(document).ready(() => {
    render_projects('featured');
})


let render_projects = (slug) => {
    let projects_area = $('.projects-wrapper');

    $('.white-button').removeClass('white-button-hover');
    $(`#${slug}`).addClass('white-button-hover');

    let projects_obj = [
        {
            image: 'assets/images/stator.png',
            link: 'https://github.com/EricCheney/DC-Motor',
            title: 'DC Rotor',
            demo: '',
            technologies: ['CAD', 'DIY'],
            description: "Custom designed DC motor rotor. 3D printed and used in DIY motor which was the highest performing in class by a large margin.",
            categories: ['featured', 'cad', 'diy']
        },
        {
            image: 'assets/images/GPU.png',
            link: '',
            title: 'GPU CAD Model',
            demo: '',
            technologies: ['CAD', 'Computer'],
            description: "Copy of a GPU PCB design. First step before I proceed to design the cooler.",
            categories: ['featured', 'cad']
        },
 {
            image: 'assets/images/Ames.jpg',
            link: 'https://github.com/EricCheney/Ames-Laboratory',
            title: 'Iowa Lab Work',
            demo: '',
            technologies: ['General'],
            description: "Worked at Ames National Laboratory.",
            categories: ['featured', 'general']
        },

    ]

    let projects = [];
    if(slug == 'all') {
        projects = projects_obj.map(project_mapper);
    } 
    else {
        projects = projects_obj.filter(project => project.categories.includes(slug)).map(project_mapper);
    }
    projects_area.hide().html(projects).fadeIn();
}

let project_mapper = project => {
    return `
        <div class="wrapper">
                
            <div class="card radius shadowDepth1">

                ${project.image ? 
                    `<div class="card__image border-tlr-radius">
                       <a href="#project-details" class="project-link"
    data-title="${project.title}"
    data-description="${project.description}"
    data-image="${project.image}"
    data-technologies='${JSON.stringify(project.technologies)}'>
                            <img src="${project.image}" alt="image" id="project-image" class="border-tlr-radius">
                        </a>
                    </div>`           
                : ''}

        
                <div class="card__content card__padding">
        
                    <article class="card__article">
                      <h2><a href="${project.link}">${project.title}</a></h2>
        
                        <p class="paragraph-text-normal">${project.description} ${project.demo ? `<a href="${project.demo}">Demo</a>` : ''}</p>
                    </article>

                                
                    <div class="card__meta">
                        ${project.technologies.map(tech =>
                            `<span class="project-technology paragraph-text-normal">${tech}</span>`
                        ).join('')}
                    </div>

                </div>
            </div>
        </div>
    `
}

let selected = (slug) => {
    render_projects(slug);
}

$(document).on('click', '.project-link, .project-title-link', function (e) {
    e.preventDefault();
    
    const title = $(this).data('title');
    const description = $(this).data('description');
    const image = $(this).data('image');
    const technologies = JSON.parse($(this).attr('data-technologies'));

    $('#project-details-title').text(title);
    $('#project-details-description').text(description);
    $('#project-details-image').attr('src', image);

    const techHtml = technologies.map(tech =>
        `<span class="project-technology paragraph-text-normal">${tech}</span>`
    ).join(' ');
    $('#project-details-technologies').html(techHtml);

    document.getElementById('project-details').scrollIntoView({ behavior: 'smooth' });
});
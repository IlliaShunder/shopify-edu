document.addEventListener('DOMContentLoaded', ()=> {
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('.faq-card__trigger');
    if (!trigger) return;

    const card = trigger.closest('.faq-card');
    const wrapper = trigger.closest('.faq-wrapper');
    const content = card.querySelector('.faq-card__content');

    const isOpen = card.classList.contains('active');

    const closeCard = (item) => {
      item.classList.remove('active');
      const innerContent = item.querySelector('.faq-card__content');
      innerContent.style.maxHeight = null;
    };

    wrapper.querySelectorAll('.faq-card').forEach((item) => {
      if (item !== card) closeCard(item);
    });

    if (isOpen) {
      closeCard(card);
    } else {
      card.classList.add('active');
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  });
});

var removedOptions = [];
$("option").click(function() {
    var currentValue = $("#productSearch").val();
    var searchBox = $("#productSearch")
    if (this.value === '') {
      searchBox.val('');
      removedOptions.forEach(function(item) {
        $('#products').append(item);
      })
      removedOptions = [];
    } else if (currentValue === '') {
      searchBox.val(this.value);
      this.remove()
      removedOptions.push(this);
    } else {
      searchBox.val(currentValue += ", " + this.value);
      this.remove()
      removedOptions.push(this);
    }
})
